// Sends the 49x39 RGB buffer from the Pi to a selected sink (e.g., serial or UDP); manages connection lifecycle.
import crypto from 'crypto';
import config from '../config.js';

class SimulatorTransmitter {
  connect() { }
  send(data) { }
  disconnect() { }
}

let frame = 0;
const transmitters = []

async function connect() {
  if (config.sinks.simulator.enabled) transmitters.push(new SimulatorTransmitter());
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