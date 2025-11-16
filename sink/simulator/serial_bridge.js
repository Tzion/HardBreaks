import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import  config  from '../../config.js';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Browser connected');

  // Open serial port
    const path = config.sinks.simulator.virtualPort.enabled ?
        config.sinks.simulator.virtualPort.path :
        config.serial.path;
  const port = new SerialPort({
    path: path,
    baudRate: 115200
  });

  port.on('data', (data) => {
    console.log('Serial data:', data);
    ws.send(JSON.stringify({ data: Array.from(data) }));
  });

  ws.on('close', () => {
    port.close();
  });
});

console.log('Serial bridge running on ws://localhost:8080');