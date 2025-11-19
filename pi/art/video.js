// Video playback source: reads frames from a video file to feed the LED matrix.
import canvasSketch from 'canvas-sketch';
import { createCanvas, loadImage } from 'canvas';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Extract frames from video using ffmpeg
 * @param {string} videoPath - Path to the video file
 * @param {number} fps - Target frames per second
 * @param {string} outputDir - Directory to save extracted frames
 * @returns {Promise<string[]>} Array of frame file paths
 */
async function extractFrames(videoPath, fps = 3, outputDir = '/tmp/video-frames') {
    // Create output directory
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`Extracting frames from ${videoPath} at ${fps} fps...`);

    // Use ffmpeg to extract frames
    const outputPattern = path.join(outputDir, 'frame_%04d.png');
    const command = `ffmpeg -i "${videoPath}" -vf "fps=${fps}" "${outputPattern}"`;

    try {
        await execAsync(command);

        // Read extracted frame files
        const files = fs.readdirSync(outputDir)
            .filter(f => f.endsWith('.png'))
            .sort()
            .map(f => path.join(outputDir, f));

        console.log(`Extracted ${files.length} frames`);
        return files;
    } catch (error) {
        console.error('Error extracting frames:', error.message);
        throw error;
    }
}

/**
 * Create a canvas-sketch animation from video frames
 * @param {string} videoPath - Path to the video file
 * @param {Object} options - Options for video playback
 * @param {number} options.fps - Frames per second (default: 30)
 * @param {boolean} options.loop - Whether to loop the video (default: true)
 * @returns {Function} Canvas-sketch animation function
 */
export async function createVideoAnimation(videoPath, options = {}) {
    const { fps = 30, loop = true } = options;
    let frames = [];
    let currentFrame = 0;

    // Extract and load frames before returning the animation function
    const framePaths = await extractFrames(videoPath, fps);
    console.log('Loading frames into memory...');
    frames = await Promise.all(
        framePaths.map(async (framePath) => {
            return await loadImage(framePath);
        })
    );
    console.log(`Loaded ${frames.length} frames, ready to play`);

    return ({ context, width, height }) => {
        // Clear canvas
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);

        // Draw current frame
        const frame = frames[currentFrame];

        // Calculate scaling to fit canvas while maintaining aspect ratio
        const scaleX = width / frame.width;
        const scaleY = height / frame.height;
        const scale = Math.min(scaleX, scaleY);

        const drawWidth = frame.width * scale;
        const drawHeight = frame.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        context.drawImage(frame, x, y, drawWidth, drawHeight);

        // Advance to next frame
        currentFrame++;
        if (currentFrame >= frames.length) {
            if (loop) {
                currentFrame = 0;
            } else {
                currentFrame = frames.length - 1; // Stay on last frame
            }
        }
    };
}

/**
 * Simple sketch for testing - plays a default video
 */
const sketch = () => {
    const videoPath = path.join(__dirname, 'videos', 'cooling1.mp4');
    return createVideoAnimation(videoPath, { fps: 30, loop: true });
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
    const settings = {
        dimensions: [490, 390],
        animate: true,
        fps: 30
    };
    canvasSketch(sketch(), settings);
}

// Export for Node runtime
export default sketch;