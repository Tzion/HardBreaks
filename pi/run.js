// Orchestrates the render loop on the Pi: generate → pixelize → transmit at the configured FPS.
import canvasSketch from 'canvas-sketch';
import { createCanvas } from 'canvas';
import * as transmit from './transmit.js';
import crackAnimation from './art/crack.js';
import * as pixelize from './pixelize.js';
import { toRGB, createPacket, remapToPhysicalLayout } from './frame.js';
import fs from 'fs';

async function runSketchAnimation(sketchAnimation, settings) {
    const [width, height] = settings.dimensions;
    const canvas = createCanvas(width, height);

    const manager = await canvasSketch(sketchAnimation, {
        ...settings,
        canvas
    });

    const { context } = manager.props;
    await transmit.connect();

    setInterval(() => {
        manager.render();
        const outPath = 'last-frame.png';
        try {
            fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
            console.log(`Saved frame to ${outPath}`);
        } catch (err) {
            console.error('Failed to save frame:', err);
        }
        const imageData = context.getImageData(0, 0, width, height);
        const downScaled = pixelize.scaleDown(imageData, 49, 39);
        const rgb = toRGB(downScaled);
        const remapped = remapToPhysicalLayout(rgb, 49, 39);
        const packet = createPacket(remapped);
        transmit.send(packet);
    }, 4000 / settings.fps);
}

const settings = {
    dimensions: [1080, 1080],
    animate: false,
    fps: 3
};

runSketchAnimation(crackAnimation, settings)