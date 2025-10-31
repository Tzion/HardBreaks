// Sends the 49x39 RGB buffer from the Pi to a selected sink (e.g., serial or UDP); manages connection lifecycle.
import crypto from 'crypto';
import config from '../config.js';
import { SerialPort } from 'serialport';

class SerialTransmitter {
  constructor(path = config.serial.path, baudRate = config.serial.baudRate) {
    this.path = path;
    this.baudRate = baudRate;
    this.port = null
  }

  async connect() {
    this.port = new SerialPort({ path: this.path, baudRate: this.baudRate });
    // should we use try-catch instead of resolve and reject
    await new Promise((resolve, reject) => {
      this.port.on('open', resolve);
      this.port.on('error', reject);
    });
    console.log(`SerialTransmitter connected: ${this.path} @ ${this.baudRate}`);
  }

  send(data) {
    if (!this.port?.isOpen) return;
    this.port.write(data, (err) => {
      if (err) console.error('SerialTransmitter write error:', err);
    });
  }

  disconnect() {
    if (this.port) {
      this.port.close();
      this.port = null;
    }
  }
}




let frame = 0;
const transmitters = []

async function connect() {
  if (config.serial.enabled)
    transmitters.push(new SerialTransmitter(config.serial.path, config.serial.baudRate));
  transmitters.forEach(t => t.connect());
  console.log(transmitters.length ? "All transmitters connected" : "No transmitters to connect");
}

function send(data) {
  frame++;
  const len = data?.length || 0;
  const hash = data ? crypto.createHash('sha256').update(data).digest('hex') : '';
  console.log(`transmit.send() frame=${frame} bytes=${len} hash=${hash}`);
  transmitters.forEach(t => t.send(data));
}

function disconnect() {
  transmitters.forEach(t => t.disconnect());
  console.log('transmit.disconnect()');
}

export { connect, send, disconnect };