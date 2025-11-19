// Load an image file, downscale it to LED matrix dimensions, and transmit it
import { createCanvas, loadImage } from 'canvas';
import * as transmit from './transmit.js';
import * as pixelize from './pixelize.js';
import { toRGB, createPacket, remapToPhysicalLayout, pixelAt } from './frame.js';
import fs from 'fs';

const saveImages = true;

async function sendImageToLEDs(scaleX, scaleY, imagePath) {
    if (!fs.existsSync(imagePath)) {
        console.error(`Image not found: ${imagePath}`);
        process.exit(1);
    }

    console.log(`Loading image: ${imagePath}`);
    const img = await loadImage(imagePath);

    // Create a canvas and draw the image
    const canvas = createCanvas(img.width, img.height);
    const context = canvas.getContext('2d');
    context.drawImage(img, 0, 0);

    // Get the image data
    const imageData = context.getImageData(0, 0, img.width, img.height);
    console.log(`Original image size: ${img.width}x${img.height}`);

    const downScaled = pixelize.scaleDown(imageData, scaleX, scaleY);
    console.log(`Downscaled to: ${scaleX}x${scaleY}`);
    if (saveImages) {
        const outCanvas = createCanvas(scaleX, scaleY);
        const outCtx = outCanvas.getContext('2d');
        outCtx.putImageData(downScaled, 0, 0);
        const outBuffer = outCanvas.toBuffer('image/png');
        fs.writeFileSync('downScaled__send_image.png', outBuffer);
        console.log("Saved downscaled image to 'downScaled__send_image.png'");
    }

    const rgb = toRGB(downScaled);
    console.log(`RGB buffer size: ${rgb.length} bytes`);
    if (saveImages) {
        saveImage(rgb, scaleX, scaleY, 'rgb', true);
    }

    // Calculate groups based on width (7 strips per group)
    const stripsPerGroup = 7;
    const groups = scaleX / stripsPerGroup;
    const remapped = remapToPhysicalLayout(rgb, scaleX, scaleY, groups, stripsPerGroup);
    console.log(`Remapped for physical layout: ${remapped.length} bytes (${groups} groups, ${stripsPerGroup} strips/group)`);
    if (saveImages) {
        saveImage(remapped, scaleY, scaleX, 'remapped', true);
    }

    console.log(`Remapped for physical layout: ${remapped.length} bytes (${groups} groups, ${stripsPerGroup} strips/group)`);

        // Apply group offsets (temporary fix for wiring quirks)
    // Positive offset: add dummy pixels at start
    // Negative offset: skip pixels from the source data
    const GROUP_OFFSETS = [1, -1, 0]; // Group 0 adds 1 pixel, Group 1 skips 1 pixel, Group 2 no change
    
    // Calculate total size with offsets
    const totalOffsetBytes = GROUP_OFFSETS.reduce((sum, o) => sum + (o > 0 ? o * 3 : 0), 0);
    const withOffsets = new Uint8Array(remapped.length + totalOffsetBytes);

    let readPos = 0;
    let writePos = 0;
    const ledsPerGroup = (scaleX / groups) * scaleY;

    for (let g = 0; g < groups; g++) {
        const offset = GROUP_OFFSETS[g] || 0;
        
        if (offset > 0) {
            // Positive offset: add dummy pixels (zeros) at start
            writePos += offset * 3;
        } else if (offset < 0) {
            // Negative offset: skip pixels from source
            readPos += Math.abs(offset) * 3;
        }

        const groupBytes = ledsPerGroup * 3;
        const bytesToCopy = Math.min(groupBytes, remapped.length - readPos);
        withOffsets.set(remapped.subarray(readPos, readPos + bytesToCopy), writePos);

        readPos += groupBytes;
        writePos += bytesToCopy;
    }

    console.log(`With offsets: ${withOffsets.length} bytes (offsets: ${GROUP_OFFSETS.join(', ')})`);
    if (saveImages) {
        saveImage(withOffsets, scaleY, scaleX, 'offset', true);
    }

    const packet = createPacket(withOffsets);

    await transmit.connect();
    console.log('Sending image to LEDs...');
    transmit.send(packet);

    setTimeout(() => {
        transmit.disconnect();
        console.log('Done!');
    }, 1000);
}


function saveImage(data, width, height, namePrefix, addAlphaChannel = false) {
    const outCanvas = createCanvas(width, height);
    const outCtx = outCanvas.getContext('2d');

    if (addAlphaChannel) {
        // Convert RGB Uint8Array to RGBA ImageData
        const imageData = outCtx.createImageData(width, height);
        for (let i = 0; i < data.length / 3; i++) {
            imageData.data[i * 4] = data[i * 3];         // R
            imageData.data[i * 4 + 1] = data[i * 3 + 1]; // G
            imageData.data[i * 4 + 2] = data[i * 3 + 2]; // B
            imageData.data[i * 4 + 3] = 255;             // A (fully opaque)
        }
        outCtx.putImageData(imageData, 0, 0);
    } else {
        // Data is already ImageData
        outCtx.putImageData(data, 0, 0);
    }

    const outBuffer = outCanvas.toBuffer('image/png');
    const filename = `${namePrefix}__send_image.png`;
    fs.writeFileSync(filename, outBuffer);
    console.log(`Saved image to '${filename}'`);
}

const scaleX = parseInt(process.argv[2]) || 49;
const scaleY = parseInt(process.argv[3]) || 39;
const imagePath = process.argv[4] || 'art/heart.jpg';
sendImageToLEDs(scaleX, scaleY, imagePath);
