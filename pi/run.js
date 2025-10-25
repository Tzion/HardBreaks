// Orchestrates the render loop on the Pi: generate → pixelize → transmit at the configured FPS.
const canvasSketch = require('canvas-sketch');
const { createCanvas } = require('canvas');
const { transmit } = require('./transmit');
const crackAnimation = require('./art/crack');

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
        const imageData = context.getImageData(0, 0, width, height);
        transmit.send(imageData.data);
    }, 1000 / settings.fps);
}

const settings = {
    dimensions: [1080, 1080],
    animate: false,
    fps: 3
};

runSketchAnimation(crackAnimation, settings)