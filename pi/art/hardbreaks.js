// HardBreaks - Heart breaking and healing animation
// TO RUN (browser dev): canvas-sketch hardbreaks.js --open
import canvasSketch from 'canvas-sketch';

// State machine states
const STATES = {
    BEATING: 'BEATING',
    HALTING: 'HALTING',
    CRACKING: 'CRACKING',
    HEALING: 'HEALING'
};

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

/**
 * Update state logic - determines transitions between states
 */
function updateState(state, stateStartTime, elapsedMs) {
    const timeInState = elapsedMs - stateStartTime;

    switch (state) {
        case STATES.BEATING:
            // TODO: After N beats, transition to HALTING
            // For now, stay in BEATING forever
            return { state: STATES.BEATING, stateStartTime };

        case STATES.HALTING:
            // TODO: After halt duration, transition to CRACKING
            return { state: STATES.HALTING, stateStartTime };

        case STATES.CRACKING:
            // TODO: After cracks complete, transition to HEALING
            return { state: STATES.CRACKING, stateStartTime };

        case STATES.HEALING:
            // TODO: After healing complete, transition to BEATING (next cycle)
            return { state: STATES.HEALING, stateStartTime };

        default:
            return { state: STATES.BEATING, stateStartTime: elapsedMs };
    }
}

/**
 * Render based on current state
 */
function renderState(context, width, height, state, elapsedMs, stateStartTime, baseSize) {
    const timeInState = elapsedMs - stateStartTime;

    // Background
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    switch (state) {
        case STATES.BEATING: {
            // Beating heart with pulse
            const beatScale = calculateBeatScale(elapsedMs, 50); // BPM=50
            const currentHeartSize = baseSize * beatScale;
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, currentHeartSize);
            break;
        }

        case STATES.HALTING: {
            // TODO: Static heart (no pulse), maybe slight shake
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, baseSize);
            break;
        }

        case STATES.CRACKING: {
            // TODO: Static heart + growing cracks
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, baseSize);
            // TODO: draw cracks
            break;
        }

        case STATES.HEALING: {
            // TODO: Static heart + healing cracks (fade/glow)
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, baseSize);
            // TODO: draw healing effects
            break;
        }
    }
}

const sketch = ({ width, height }) => {
    const baseSizeFactor = 0.25;
    const startTime = Date.now();

    // State machine variables
    let currentState = STATES.BEATING;
    let stateStartTime = 0; // Time when current state began (relative to startTime)

    return ({ context, width, height }) => {
        const baseSize = Math.min(width, height) * baseSizeFactor;
        const elapsedMs = Date.now() - startTime;

        // Update state transitions
        const stateUpdate = updateState(currentState, stateStartTime, elapsedMs);
        if (stateUpdate.state !== currentState) {
            console.log(`State transition: ${currentState} -> ${stateUpdate.state}`);
            currentState = stateUpdate.state;
            stateStartTime = stateUpdate.stateStartTime;
        }

        // Render current state
        renderState(context, width, height, currentState, elapsedMs, stateStartTime, baseSize);
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
