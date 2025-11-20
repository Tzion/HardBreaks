// HardBreaks (Phase 0) - Static heart prototype
// Minimal starter: draws a single static heart centered on the canvas.
// TO RUN (browser dev): canvas-sketch hardbreaks.js --open
import canvasSketch from 'canvas-sketch';

function drawHeart(context, cx, cy, size) {
    context.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.08) {
        const xt = 16 * Math.pow(Math.sin(t), 3);
        const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const x = cx + (xt * size) / 16;
        const y = cy + (yt * size) / 16;
        if (t === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
}

const sketch = () => {
    return ({ context, width, height }) => {
        // Background
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);

        // Static heart (no animation yet)
        context.save();
        context.translate(width / 2, height / 2);
        context.fillStyle = 'rgb(255,20,60)';
        drawHeart(context, 0, 0, Math.min(width, height) * 0.25);
        context.restore();
    };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
    canvasSketch(sketch, {
        dimensions: [490, 390], // Matches LED aspect scaled for dev preview
        animate: false
    });
}

export default sketch;
