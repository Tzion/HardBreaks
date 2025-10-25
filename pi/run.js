// Orchestrates the render loop on the Pi: generate → pixelize → transmit at the configured FPS.

import canvasSketch from 'canvas-sketch';
import { connect, send } from './transmit';
import crackAnimation from './art/crack';


async function runSketchAnimation(sketchAnimation, settings = {}) {
    const manager = await canvasSketch(sketchAnimation, {
        ...settings,
        animate: true
    });

    const { canvas, context } = manager.props;

    // Connect to hardware
    await connect();

    // Override render to capture frames
    const originalRender = manager.render.bind(manager);
    manager.render = () => {
        const result = originalRender();

        // Extract and send frame
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        debugger;
        send(imageData.data);

        return result;
    };

    manager.play();
}

const settings = {
    dimensions: [1080, 1080],
    animate: false,
    fps: 3
};

runSketchAnimation(crackAnimation, settings)