// HardBreaks - Heart breaking and healing animation
// TO RUN (browser dev): canvas-sketch hardbreaks.js --open
import canvasSketch from 'canvas-sketch';

function drawHeart(context, cx, cy, size) {
    context.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.08) {
        const xt = 19 * Math.pow(Math.sin(t), 3);
        const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
        const x = cx + (xt * size) / 16;
        const y = cy + (yt * size) / 16;
        if (t === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
}

/**
 * Calculate beat scale based on elapsed time
 * @param {number} elapsedMs - Milliseconds since animation start
 * @param {number} bpm - Beats per minute
 * @param {number} amplitude - How much to scale (0.25 = 25% larger at peak)
 * @returns {number} Scale multiplier (1.0 baseline, up to 1.0 + amplitude)
 */
function calculateBeatScale(elapsedMs, bpm, amplitude = 0.25) {
    const beatsPerSecond = bpm / 60;
    const beatsElapsed = (elapsedMs / 1000) * beatsPerSecond;
    const beatPhase = beatsElapsed % 1; // 0..1 within current beat
    const pulse = Math.sin(beatPhase * Math.PI); // smooth in/out, peaks at 0.5
    return 1 + amplitude * pulse;
}

const sketch = ({ width, height }) => {
    const BPM = 50;
    const baseSizeFactor = 0.25; // fraction of min dimension
    const startTime = Date.now();

    return ({ context, width, height }) => {
        const baseSize = Math.min(width, height) * baseSizeFactor;
        const elapsedMs = Date.now() - startTime;

        // Background
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);

        // Calculate beat scale - multiply by base size instead of using context.scale()
        // This way only the heart size changes, not the entire coordinate space
        const beatScale = calculateBeatScale(elapsedMs, BPM);
        const currentHeartSize = baseSize * beatScale;

        // Draw heart at center with dynamic size
        context.fillStyle = 'rgb(255,20,60)';
        drawHeart(context, width / 2, height / 2, currentHeartSize);
        
        // Future: draw cracks, scars, etc. here at their original positions
        // They won't be affected by the heart's beat scaling
    };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
    canvasSketch(sketch, {
        dimensions: [490, 390], // Matches LED aspect scaled for dev preview
        animate: true,
        fps: 30
    });
}

export default sketch;
