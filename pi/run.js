// Orchestrates the render loop on the Pi: generate → pixelize → transmit at the configured FPS.
import canvasSketch from 'canvas-sketch';
import { createCanvas } from 'canvas';
import * as transmit from './transmit.js';
import * as pixelize from './pixelize.js';
import { toRGB, createPacket, remapToPhysicalLayout } from './frame.js';
import fs from 'fs';
import crackAnimation from './art/crack.js';
import heartbreaksAnimation from './art/hardbreaks.js';

async function runSketchAnimation(sketchAnimation, settings) {
    const [width, height] = settings.dimensions;
    const canvas = createCanvas(width, height);

    const manager = await canvasSketch(sketchAnimation, {
        ...settings,
        canvas
    });

    const { context } = manager.props;

    try {
        await transmit.connect();
    } catch (err) {
        console.error('Failed to connect to controller:', err.message);
    }

    setInterval(async () => {
        // Check health before sending
        if (!transmit.isHealthy()) {
            console.warn('Connection unhealthy, reconnecting...');
            await transmit.disconnect();
            await transmit.connect();
            return; // Skip this frame
        }

        manager.render();
        // SAVE ONLY FOR DEBUGGING NOT PRODUCTION!!!
        // const outPath = 'last-frame.png';
        // try {
        //     fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
        //     console.log(`Saved frame to ${outPath}`);
        // } catch (err) {
        //     console.error('Failed to save frame:', err);
        // }
        const imageData = context.getImageData(0, 0, width, height);
        const downScaled = pixelize.scaleDown(imageData, 49, 39);
        const rgb = toRGB(downScaled);
        const remapped = remapToPhysicalLayout(rgb, 49, 39);
        const packet = createPacket(remapped);
        transmit.send(packet);
    }, 1000 / settings.fps);
}

const settings = {
    dimensions: [490, 390],
    animate: true,
    fps: 17
};

runSketchAnimation(heartbreaksAnimation, settings)