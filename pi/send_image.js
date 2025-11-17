// Load an image file, downscale it to LED matrix dimensions, and transmit it
import { createCanvas, loadImage } from 'canvas';
import * as transmit from './transmit.js';
import * as pixelize from './pixelize.js';
import { toRGB, createPacket } from './frame.js';
import fs from 'fs';

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

    const rgb = toRGB(downScaled);
    console.log(`RGB buffer size: ${rgb.length} bytes`);

    const packet = createPacket(rgb);

    await transmit.connect();
    console.log('Sending image to LEDs...');
    transmit.send(packet);

    setTimeout(() => {
        transmit.disconnect();
        console.log('Done!');
    }, 1000);
}

const scaleX = parseInt(process.argv[2]) || 49;
const scaleY = parseInt(process.argv[3]) || 39;
const imagePath = process.argv[4] || 'art/heart.jpg';
sendImageToLEDs(scaleX, scaleY, imagePath);
