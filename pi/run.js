// Orchestrates the render loop on the Pi: playlist (generate + pixelize) → transmit at the configured FPS.
import { createCanvas } from 'canvas';
import * as transmit from './transmit.js';
import { toRGB, createPacket, remapToPhysicalLayout } from './frame.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Player } from './player.js';
import { AudioPlayer } from './audio.js';
import { fadeThroughBlack, crossfade, gather } from './transitions.js';
import crackAnimation from './art/crack.js';
import heartbreaksAnimation, { pinkSketch } from './art/hardbreaks.js';
import ambientAnimation from './art/ambient.js';

// Debug output (per-frame logs, saving frames), off unless DEBUG=1 or DEBUG=true: DEBUG=1 node pi/run.js
const DEBUG = ['1', 'true'].includes(process.env.DEBUG);

// The playlist (see pi/player.js): the first item plays first, then the order setting decides.
// transitionIn is the transition used when switching to that item; otherwise the default below.
const player = new Player([
    { name: 'hardbreaks', sketch: heartbreaksAnimation, minutes: 3000, transitionIn: gather({ seconds: 10 }) },
], {
    size: [147, 117], // 3× the 49×39 LEDs: smooth edges after shrinking, without wasting CPU
    order: 'shuffle',
    transition: fadeThroughBlack({ seconds: 2 }),
});

// Audio tracks from audio/ (see pi/audio.js): shuffled, with a random pause between tracks
const audio = new AudioPlayer({
    dir: fileURLToPath(new URL('../audio', import.meta.url)),
    pauseMinS: 60,
    pauseMaxS: 60,
});

async function run(fps) {
    await player.start();
    audio.start();

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

        const frame = player.frame();

        // Saving every frame is slow: only with DEBUG set, never in production
        if (DEBUG) {
            const outPath = 'last-frame.png';
            try {
                const canvas = createCanvas(frame.width, frame.height);
                canvas.getContext('2d').putImageData(frame, 0, 0);
                fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
                console.log(`Saved frame to ${outPath}`);
            } catch (err) {
                console.error('Failed to save frame:', err);
            }
        }
        const rgb = toRGB(frame);
        const remapped = remapToPhysicalLayout(rgb, 49, 39);
        const packet = createPacket(remapped);
        transmit.send(packet);
    }, 1000 / fps);
}

run(17);
