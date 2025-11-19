// Play video and transmit to LED matrix
import canvasSketch from 'canvas-sketch';
import { createCanvas } from 'canvas';
import * as transmit from './transmit.js';
import { createVideoAnimation } from './art/video.js';
import * as pixelize from './pixelize.js';
import { toRGB, createPacket, remapToPhysicalLayout } from './frame.js';
import fs from 'fs';
import path from 'path';

async function runVideo(videoPath, settings) {
    const [width, height] = settings.dimensions;
    const canvas = createCanvas(width, height);

    // Create video animation
    const videoSketch = () => createVideoAnimation(videoPath, {
        fps: settings.fps,
        loop: settings.loop !== false
    });

    const manager = await canvasSketch(videoSketch, {
        ...settings,
        canvas
    });

    const { context } = manager.props;
    
    // Connect to LED controller
    await transmit.connect();

    // Render and transmit frames at specified FPS
    let frameCount = 0;
    setInterval(() => {
        manager.render();
        
        // Save preview frame occasionally -- SLOW DOWN THE SYSTEM - JUST FOR DEBUGGING
        // if (frameCount % 50 === 0) {
        //     const outPath = 'last-frame-video.png';
        //     try {
        //         fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
        //         console.log(`Frame ${frameCount}: Saved preview to ${outPath}`);
        //     } catch (err) {
        //         console.error('Failed to save frame:', err);
        //     }
        // }

        // Process and transmit to LED matrix
        const imageData = context.getImageData(0, 0, width, height);
        const downScaled = pixelize.scaleDown(imageData, 49, 39);
        const rgb = toRGB(downScaled);
        const remapped = remapToPhysicalLayout(rgb, 49, 39);
        const packet = createPacket(remapped);
        transmit.send(packet);

        frameCount++;
    }, 1000 / settings.fps);

    console.log(`Playing video at ${settings.fps} fps...`);
}

// Get video path from command line or use default
const videoPath = process.argv[2] || path.join(process.cwd(), 'pi/art/videos/cooling1.mp4');

if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    console.log('Usage: node pi/run_video.js [path/to/video.mp4]');
    process.exit(1);
}

const settings = {
    dimensions: [1080, 1080],
    animate: true,
    fps: 5,
    loop: true
};

console.log(`Loading video: ${videoPath}`);
runVideo(videoPath, settings);
