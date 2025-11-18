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

    const packet = createPacket(remapped);

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
