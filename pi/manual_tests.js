import * as transmit from './transmit.js';
import { createPacket } from './frame.js'


async function sendFrame() {
    await transmit.connect();
    const rgbFrame = markerFrame();
    const packet = createPacket(rgbFrame);

    transmit.send(packet);
    transmit.disconnect()
}

const fromUser = parseInt(process.argv[2]) || 0;

function markerFrame(index = fromUser) {
    var marker = new Uint8Array([
        0, 255, 0,
    ]);
    const padCount = index;
    var padding = new Uint8Array(padCount * 3);
    var rgbFrame = new Uint8Array(marker.length + padding.length);
    rgbFrame.set(padding, 0);
    rgbFrame.set(marker, padding.length);
    console.log(rgbFrame)
    return rgbFrame;
}


function rgbFrame() {
    // 3 pixels: [R,G,B] each, flattened into a single array
    return new Uint8Array([
        255, 0, 0,
        0, 255, 0,
        0, 0, 255
    ]);
}

sendFrame();