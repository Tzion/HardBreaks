// HardBreaks (Phase 0) - Static heart prototype
// Minimal starter: draws a single static heart centered on the canvas.
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

const sketch = () => {
    const BPM = 120; // beats per minute (real-time, not tied to FPS)
    const baseSizeFactor = 0.25; // fraction of min dimension
    return ({ context, width, height, time }) => {
        const baseSize = Math.min(width, height) * baseSizeFactor;
        // Background
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);

        // Time-based beat phase stays consistent regardless of actual frame rate
        // Beats per second = BPM / 60; total beats elapsed = time * BPM / 60
        const beatsElapsed = time * BPM / 60;
        const beatPhase = beatsElapsed % 1; // 0..1 within current beat
        const pulse = Math.sin(beatPhase * Math.PI); // smooth in/out
        const scale = 1 + 0.25 * pulse; // enlarge up to +25%

        context.save();
        context.translate(width / 2, height / 2);
        context.scale(scale, scale);
        context.fillStyle = 'rgb(255,20,60)';
        drawHeart(context, 0, 0, baseSize);
        context.restore();
    };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
    canvasSketch(sketch, {
        dimensions: [490, 390], // Matches LED aspect scaled for dev preview
        animate: true,
        fps: 10
    });
}

export default sketch;
