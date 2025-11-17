import * as transmit from './transmit.js';
import { createPacket } from './frame.js'

async function sendFrame() {
    await transmit.connect();
    const rgbFrame = generateSimpleFrame();
    const packet = createPacket(rgbFrame);

    transmit.send(packet);
    transmit.disconnect()
}

function generateSimpleFrame() {
    // 3 pixels: [R,G,B] each, flattened into a single array
    return new Uint8Array([
        255, 0, 0,
        0, 255, 0,
        0, 0, 255
    ]);
}


sendFrame();