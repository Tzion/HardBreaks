// Sends the 49x39 RGB buffer from the Pi to a selected sink (e.g., serial or UDP); manages connection lifecycle.
import crypto from 'crypto';
import config from '../config.js';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

class SerialTransmitter {
  constructor(path = config.serial.path, baudRate = config.serial.baudRate) {
    this.path = path;
    this.baudRate = baudRate;
    this.port = null;
    this.lastWriteSuccess = Date.now();
  }

  async connect() {
    this.port = new SerialPort({ path: this.path, baudRate: this.baudRate });
    const parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (line) => {
      console.log(`CONTROLLER: ${line}`);
    });

    await new Promise((resolve, reject) => {
      this.port.on('open', resolve);
      this.port.on('error', reject);
    });
    console.log(`SerialTransmitter connected: ${this.path} @ ${this.baudRate}`);
    this.lastWriteSuccess = Date.now();
  }

  send(data) {
    if (!this.port?.isOpen) return false;

    this.port.write(data, (err) => {
      if (err) {
        console.error('Write error:', err);
      } else {
        this.lastWriteSuccess = Date.now();
      }
    });
    return true;
  }

  isHealthy(maxAgeMs = 5000) {
    return this.port?.isOpen && (Date.now() - this.lastWriteSuccess < maxAgeMs);
  }

  async disconnect() {
    if (this.port) {
      return new Promise((resolve) => {
        this.port.close((err) => {
          if (err) console.error('Disconnect error:', err);
          this.port = null;
          resolve();
        });
      });
    }
    return Promise.resolve();
  }
}




let frame = 0;
const transmitters = []

async function connect() {
  if (config.serial.enabled)
    transmitters.push(new SerialTransmitter(config.serial.path, config.serial.baudRate));
  await Promise.all(transmitters.map(t => t.connect()));
  console.log(transmitters.length ? "All transmitters connected" : "No transmitters to connect");
}

async function send(data) {
  frame++;
  const len = data?.length || 0;
  const hash = data ? crypto.createHash('sha256').update(data).digest('hex') : '';
  console.log(`transmit.send() frame=${frame} bytes=${len} hash=${hash}`);
  transmitters.forEach(t => t.send(data));
}

function isHealthy() {
  return transmitters.every(t => t.isHealthy());
}

async function disconnect() {
  await Promise.all(transmitters.map(t => t.disconnect()));
  console.log('transmit.disconnect()');
}

export { connect, send, disconnect, isHealthy };