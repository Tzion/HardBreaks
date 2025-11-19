import * as transmit from './transmit.js';
import { createPacket } from './frame.js'


async function sendFrame(frameGenerator, ...args) {
    await transmit.connect();
    const rgbFrame = frameGenerator(...args);
    const packet = createPacket(rgbFrame);

    transmit.send(packet);
    transmit.disconnect()
}


function markerFrame(index, color = 'green') {
    var marker = new Uint8Array([
        color == 'red' ? 255 : 0,
        color == 'green' ? 255 : 0,
        color == 'blue' ? 255 : 0,
    ]);
    const padCount = index;
    var padding = new Uint8Array(padCount * 3);
    var frame = new Uint8Array(marker.length + padding.length);

    // temp- delete after findg padding
    // var stripsPadding = new Uint8Array(3 * (273 * 2 + 0));
    // frame = new Uint8Array(marker.length + padding.length + stripsPadding.length);
    // padding = new Uint8Array([...stripsPadding, ...padding]);
    // end of

    frame.set(padding, 0);
    frame.set(marker, padding.length);
    console.log(frame)
    return frame;
}


function rgbFrame(padding = 0) {
    // 3 pixels: [R,G,B] each, flattened into a single array
    const base = new Uint8Array([
        255, 0, 0,
        0, 255, 0,
        0, 0, 255
    ]);

    const padCount = padding;
    const paddingBytes = new Uint8Array(padCount * 3);
    const frame = new Uint8Array(paddingBytes.length + base.length);
    frame.set(paddingBytes, 0);
    frame.set(base, paddingBytes.length);

    return frame;
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

const args = process.argv.slice(3).map(arg => {
    const num = parseInt(arg);
    return isNaN(num) ? arg : num;
});
sendFrame(frameGenerator, ...args);