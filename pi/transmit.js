const crypto = require('crypto');

// Sends the 49x39 RGB buffer from the Pi to a selected sink (e.g., serial or UDP); manages connection lifecycle.

// Simple local stub to verify frames are sent
let frame = 0;

async function connect() {
  console.log('transit.connect()');
}

function send(data) {
  frame++;
  const len = data && typeof data.length === 'number' ? data.length : 0;
  const hash = data ? crypto.createHash('sha256').update(data).digest('hex') : '';
  console.log(`transit.send() frame=${frame} bytes=${len} hash=${hash}`);
}

function disconnect() {
  console.log('transit.disconnect()');
}

const transmit = { connect, send, disconnect };
module.exports = { transmit };