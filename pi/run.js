// Orchestrates the render loop on the Pi: generate → pixelize → transmit at the configured FPS.
import canvasSketch from 'canvas-sketch';
import { createCanvas } from 'canvas';
import * as transmit from './transmit.js';
import * as pixelize from './pixelize.js';
import { toRGB, createPacket, remapToPhysicalLayout } from './frame.js';
import fs from 'fs';
import crackAnimation from './art/crack.js';
import heartbreaksAnimation, { pinkSketch } from './art/hardbreaks.js';
import ambientAnimation from './art/ambient.js';

// Debug output (per-frame logs, saving frames), off unless DEBUG=1 or DEBUG=true: DEBUG=1 node pi/run.js
const DEBUG = ['1', 'true'].includes(process.env.DEBUG);

// The first entry plays first; after that a random different one follows each time.
const playlist = [
    // { name: 'hardbreaks pink', sketch: pinkSketch, minutes: 7 },
    { name: 'ambient', sketch: ambientAnimation, minutes: 7 },
];
const FADE_MS = 1000; // fade out at the end of each animation, fade in at the start

function pickNext(current) {
    const others = playlist.filter(item => item !== current);
    return others.length ? others[Math.floor(Math.random() * others.length)] : current;
}

async function runPlaylist(settings) {
    const [width, height] = settings.dimensions;
    const canvas = createCanvas(width, height);

    let item = playlist[0];
    let itemStart = Date.now();
    let switching = false;
    console.log(`Playing ${item.name} for ${item.minutes} min`);

    const manager = await canvasSketch(item.sketch, {
        ...settings,
        canvas
    });

    const { context } = manager.props;

    try {
        await transmit.connect();
    } catch (err) {
        console.error('Failed to connect to controller:', err.message);
    }

    let reconnecting = false;
    setInterval(async () => {
        if (reconnecting) return;
        // Check health before sending
        if (!transmit.isHealthy()) {
            console.warn('Connection unhealthy, reconnecting...');
            reconnecting = true;
            try {
                await transmit.disconnect();
                await transmit.connect();
            } catch (err) {
                console.error('Reconnect failed, retrying in 2 s:', err.message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            reconnecting = false;
            return; // Skip this frame
        }
        if (switching) return; // next sketch is still loading

        const elapsed = Date.now() - itemStart;
        const remaining = item.minutes * 60 * 1000 - elapsed;
        if (remaining <= 0) {
            switching = true;
            item = pickNext(item);
            console.log(`Playing ${item.name} for ${item.minutes} min`);
            await manager.loadAndRun(item.sketch);
            itemStart = Date.now();
            switching = false;
            return;
        }

        manager.render();

        // Fade through black between animations
        const level = Math.min(1, elapsed / FADE_MS, remaining / FADE_MS);
        if (level < 1) {
            context.fillStyle = `rgba(0, 0, 0, ${1 - level})`;
            context.fillRect(0, 0, width, height);
        }
        // Saving every frame is slow: only with DEBUG set, never in production
        if (DEBUG) {
            const outPath = 'last-frame.png';
            try {
                fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
                console.log(`Saved frame to ${outPath}`);
            } catch (err) {
                console.error('Failed to save frame:', err);
            }
        }
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

runPlaylist(settings)