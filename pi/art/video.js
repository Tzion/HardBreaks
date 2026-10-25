// Video playback source: reads frames from a video file to feed the LED matrix.
// Two modes:
//   'stream' (default): ffmpeg decodes while playing and pipes raw frames in. Instant start, flat memory.
//   'cache': ffmpeg decodes once into frame files, then playback reads them back with no ffmpeg running.
//            The files go to one fixed folder that is cleared on every start (the next video overwrites
//            the previous one) and capped in size, so repeated runs can't fill the disk.
import canvasSketch from 'canvas-sketch';
import { createCanvas, ImageData } from 'canvas';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const QUEUE_SIZE = 6;                       // stream mode: frames decoded ahead
const RESTART_DELAY_MS = 2000;              // stream mode: wait before restarting a failed ffmpeg
const CACHE_DIR = '/tmp/video-frames';      // cache mode: on the Pi /tmp is in RAM
const CACHE_MAX_BYTES = 100 * 1024 * 1024;  // cache mode: stop extracting past this

async function probeVideoSize(videoPath) {
    const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`;
    const { stdout } = await execAsync(cmd);
    const [width, height] = stdout.trim().split('x').map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new Error(`Failed to probe video size: got '${stdout.trim()}'`);
    }
    return { width, height };
}

/**
 * Run ffmpeg and call onFrame(buffer) for every raw RGBA frame, already scaled to w×h.
 * With maxFrames, ffmpeg stops by itself after that many frames.
 * ffmpeg's errors are logged. Returns the child process.
 */
function decodeFrames(videoPath, { fps, w, h, loop, maxFrames }, onFrame) {
    const bytesPerFrame = w * h * 4;
    const ffmpeg = spawn('ffmpeg', [
        '-loglevel', 'error',
        ...(loop ? ['-stream_loop', '-1'] : []), // ffmpeg loops the input itself, so there's no gap
        '-i', videoPath,
        ...(maxFrames ? ['-frames:v', String(maxFrames)] : []),
        '-vf', `fps=${fps},scale=${w}:${h}`,
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let buffer = Buffer.alloc(0);
    ffmpeg.stdout.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= bytesPerFrame) {
            onFrame(Buffer.from(buffer.subarray(0, bytesPerFrame)));
            buffer = buffer.subarray(bytesPerFrame);
        }
    });
    ffmpeg.stderr.on('data', (chunk) => console.error(`ffmpeg: ${chunk.toString().trim()}`));
    return ffmpeg;
}

// Stream mode: a small queue filled by ffmpeg. When the queue is full ffmpeg is paused,
// so playback runs at the render fps and no frames are skipped.
function streamFrames(videoPath, opts) {
    const queue = [];
    let ffmpeg = null;

    function start() {
        ffmpeg = decodeFrames(videoPath, opts, (frame) => {
            queue.push(frame);
            if (queue.length >= QUEUE_SIZE) ffmpeg.stdout.pause();
        });
        ffmpeg.on('close', (code) => {
            // With looping, ffmpeg never ends on its own, so a close means it failed.
            if (!opts.loop && code === 0) return;
            console.error(`ffmpeg exited (code ${code}), restarting in ${RESTART_DELAY_MS} ms`);
            setTimeout(start, RESTART_DELAY_MS);
        });
    }
    start();

    return () => {
        const frame = queue.shift();
        if (queue.length < QUEUE_SIZE) ffmpeg.stdout.resume();
        return frame;
    };
}

// Cache mode: decode once into CACHE_DIR (cleared first), then read the files back in order.
async function cacheFrames(videoPath, opts) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    fs.mkdirSync(CACHE_DIR, { recursive: true });

    console.log(`Extracting frames from ${videoPath} at ${opts.fps} fps into ${CACHE_DIR}...`);
    const bytesPerFrame = opts.w * opts.h * 4;
    const maxFrames = Math.floor(CACHE_MAX_BYTES / bytesPerFrame);
    let count = 0;
    let truncated = false;

    // Ask for one frame over the cap: if it arrives, the video didn't fit
    await new Promise((resolve, reject) => {
        const ffmpeg = decodeFrames(videoPath, { ...opts, loop: false, maxFrames: maxFrames + 1 }, (frame) => {
            if (count >= maxFrames) {
                truncated = true;
                return;
            }
            fs.writeFileSync(path.join(CACHE_DIR, `frame_${count}.rgba`), frame);
            count++;
        });
        ffmpeg.on('close', (code) => {
            if (code === 0 && count > 0) resolve();
            else reject(new Error(`ffmpeg failed (code ${code}) after ${count} frames`));
        });
    });

    if (truncated) {
        console.warn(`Video is longer than the ${CACHE_MAX_BYTES / 1024 / 1024} MB cache: playing the first ${count} frames only`);
    }
    console.log(`Extracted ${count} frames, ready to play`);

    let index = 0;
    return () => {
        if (index >= count) {
            if (!opts.loop) return undefined; // stay on the last frame
            index = 0;
        }
        return fs.readFileSync(path.join(CACHE_DIR, `frame_${index++}.rgba`));
    };
}

/**
 * Create a canvas-sketch animation from a video file
 * @param {string} videoPath - Path to the video file
 * @param {Object} options - Options for video playback
 * @param {number} options.fps - Frames per second (default: 30)
 * @param {boolean} options.loop - Whether to loop the video (default: true)
 * @param {'stream'|'cache'} options.mode - How frames are decoded (default: 'stream')
 * @param {number[]} options.size - [width, height] of the canvas the video is drawn on (default: [490, 390])
 * @returns {Promise<Function>} Canvas-sketch render function
 */
export async function createVideoAnimation(videoPath, options = {}) {
    const { fps = 30, loop = true, mode = 'stream', size = [490, 390] } = options;

    // Decode straight to the size it's drawn at (fit inside the canvas, keep the aspect ratio)
    const src = await probeVideoSize(videoPath);
    const scale = Math.min(size[0] / src.width, size[1] / src.height);
    const w = Math.round(src.width * scale);
    const h = Math.round(src.height * scale);

    const opts = { fps, loop, w, h };
    const nextFrame = mode === 'cache' ? await cacheFrames(videoPath, opts) : streamFrames(videoPath, opts);

    const offscreen = createCanvas(w, h);
    const offCtx = offscreen.getContext('2d');
    let hasFrame = false;

    return ({ context, width, height }) => {
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);

        // No new frame (stream still starting, or the video ended): keep showing the last one
        const data = nextFrame();
        if (data) {
            const clamped = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
            offCtx.putImageData(new ImageData(clamped, w, h), 0, 0);
            hasFrame = true;
        }
        if (hasFrame) {
            context.drawImage(offscreen, Math.floor((width - w) / 2), Math.floor((height - h) / 2));
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
