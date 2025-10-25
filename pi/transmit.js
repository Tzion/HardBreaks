// Sends the 49x39 RGB buffer from the Pi to a selected sink (e.g., serial or UDP); manages connection lifecycle.

// Simple local stub to verify frames are sent
let frame = 0;

async function connect() {
  console.log('transmit.connect()');
}

function send(data) {
  frame++;
  console.log(`transmit.send() frame=${frame} bytes=${data?.length}`);
}

function disconnect() {
  console.log('transmit.disconnect()');
}

export default { connect, send, disconnect };