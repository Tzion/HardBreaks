// Sends the 49x39 RGB buffer from the Pi to a selected sink (e.g., serial or UDP); manages connection lifecycle.
import crypto from 'crypto';
import config from '../config.js';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

// Per-frame logging, off unless DEBUG=1 or DEBUG=true (e.g. DEBUG=1 node pi/run.js); it slows the render loop
const DEBUG = ['1', 'true'].includes(process.env.DEBUG);
// Lines the controller prints for every frame
const PER_FRAME_REPLY = /^(Frame \d+ received OK|Expecting \d+ bytes)/;

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
      if (DEBUG || !PER_FRAME_REPLY.test(line)) console.log(`CONTROLLER: ${line}`);
    });

    await new Promise((resolve, reject) => {
      this.port.on('open', resolve);
      this.port.on('error', reject);
    });
    console.log(`SerialTransmitter connected: ${this.path} @ ${this.baudRate}`);
    this.lastWriteSuccess = Date.now();
    this.writing = false;
  }

  // Skip the frame while the previous one is still being written, so frames never queue up
  send(data) {
    if (!this.port?.isOpen || this.writing) return false;

    this.writing = true;
    this.port.write(data, (err) => {
      this.writing = false;
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
    if (!this.port?.isOpen) {
      this.port = null; // never opened (e.g. the controller is unplugged): nothing to close
      return;
    }
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

// Create the transmitters once; reconnecting reopens the same ones
async function connect() {
  if (config.serial.enabled && transmitters.length === 0)
    transmitters.push(new SerialTransmitter(config.serial.path, config.serial.baudRate));
  await Promise.all(transmitters.map(t => t.connect()));
  console.log(transmitters.length ? "All transmitters connected" : "No transmitters to connect");
}

// Instead of a line per frame, one summary a minute
let sent = 0;
let skipped = 0;
let lastSummary = Date.now();

async function send(data) {
  frame++;
  if (DEBUG) {
    const len = data?.length || 0;
    const hash = data ? crypto.createHash('sha256').update(data).digest('hex') : '';
    console.log(`transmit.send() frame=${frame} bytes=${len} hash=${hash}`);
  }
  const results = transmitters.map(t => t.send(data));
  if (results.every(Boolean)) sent++;
  else skipped++;

  if (Date.now() - lastSummary >= 60 * 1000) {
    console.log(`Last minute: ${sent} frames sent, ${skipped} skipped (previous frame still being written, or port closed)`);
    sent = 0;
    skipped = 0;
    lastSummary = Date.now();
  }
}

function isHealthy() {
  return transmitters.every(t => t.isHealthy());
}

async function disconnect() {
  await Promise.all(transmitters.map(t => t.disconnect()));
  console.log('transmit.disconnect()');
}

export { connect, send, disconnect, isHealthy };