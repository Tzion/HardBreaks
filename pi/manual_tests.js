import * as transmit from './transmit.js';
import { createPacket } from './frame.js'


async function sendFrame(frameGenerator, ...args) {
    await transmit.connect();
    const rgbFrame = frameGenerator(...args);
    const packet = createPacket(rgbFrame);

    transmit.send(packet);
    transmit.disconnect()
}


function markerFrame(index) {
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

// Map function names to actual functions
const frameGenerators = {
    markerFrame,
    rgbFrame
};

const frameGeneratorName = process.argv[2] || 'markerFrame';
const frameGenerator = frameGenerators[frameGeneratorName];

if (!frameGenerator) {
    console.error(`Unknown frame generator: ${frameGeneratorName}`);
    console.error(`Available generators: ${Object.keys(frameGenerators).join(', ')}`);
    process.exit(1);
}

const arg = parseInt(process.argv[3]) || 0;
sendFrame(frameGenerator, arg);