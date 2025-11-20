// HardBreaks - Heart breaking and healing animation
// TO RUN (browser dev): canvas-sketch hardbreaks.js --open
import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random';

// State machine states
const STATES = {
    BEATING: 'BEATING',
    HALTING: 'HALTING',
    CRACKING: 'CRACKING',
    HEALING: 'HEALING'
};

// Configuration for timing (will expand later per phase)
const CONFIG = {
    BPM: 50,                  // heart beats per minute in BEATING state
    BEATS_BEFORE_HALTING: 2,  // number of full beats before halting
    HALT_DURATION_MS: 1500,   // how long to stay halted (ms)
    BEAT_AMPLITUDE: 0.25,     // 25% enlargement at peak
    CRACK_COUNT: 2,           // number of cracks to generate
    CRACK_DURATION_MS: 5800,  // duration of crack growth animation
    CRACK_STEPS_MIN: 12,
    CRACK_STEPS_MAX: 28,
    CRACK_NOISE_FREQ_MIN: 30,
    CRACK_NOISE_FREQ_MAX: 160,
    CRACK_NOISE_AMP_MIN: 8,
    CRACK_NOISE_AMP_MAX: 45
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

// Build heart path (no fill) for clipping or stroke operations
function buildHeartPath(context, cx, cy, size) {
    context.beginPath();
    for (let t = 0; t < Math.PI * 2; t += 0.05) {
        const xt = 19 * Math.pow(Math.sin(t), 3);
        const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
        const x = cx + (xt * size) / 16;
        const y = cy + (yt * size) / 16;
        if (t === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath();
}

/**
 * Calculate beat scale based on elapsed time
 * @param {number} elapsedMs - Milliseconds since animation start
 * @param {number} bpm - Beats per minute
 * @param {number} amplitude - How much to scale (0.25 = 25% larger at peak)
 * @returns {{ scale: number, beatsElapsed: number, beatPhase: number }}
 *   scale: Scale multiplier (1.0 baseline, up to 1.0 + amplitude)
 *   beatsElapsed: Total beats since start (fractional)
 *   beatPhase: Phase within current beat [0,1)
 */
function calculateBeatScale(elapsedMs, bpm, amplitude = 0.25) {
    const beatsPerSecond = bpm / 60;
    const beatsElapsed = (elapsedMs / 1000) * beatsPerSecond;
    const beatPhase = beatsElapsed % 1; // 0..1 within current beat
    const pulse = Math.sin(beatPhase * Math.PI); // smooth in/out, peaks at 0.5
    return { scale: 1 + amplitude * pulse, beatsElapsed, beatPhase };
}

/**
 * Update state logic - determines transitions between states
 */
function updateState(state, stateStartTime, elapsedMs, beatsSinceOffset, beatPhase, beatsElapsed, timeInState) {
    // timeInState passed in for reuse (avoid recompute)

    switch (state) {
        case STATES.BEATING: {
            // Only transition at a beat boundary so the scale is back to baseline (smooth)
            const wholeBeats = Math.floor(beatsSinceOffset);
            const atBoundary = beatPhase < 0.03 || beatPhase > 0.97; // tolerant to FPS
            if (wholeBeats >= CONFIG.BEATS_BEFORE_HALTING && atBoundary) {
                return { state: STATES.HALTING, stateStartTime: elapsedMs, setBeatOffsetTo: Math.floor(beatsElapsed) };
            }
            return { state: STATES.BEATING, stateStartTime };
        }
        case STATES.HALTING: {
            if (timeInState >= CONFIG.HALT_DURATION_MS) {
                // Transition into cracking phase after halt completes
                return { state: STATES.CRACKING, stateStartTime: elapsedMs };
            }
            return { state: STATES.HALTING, stateStartTime };
        }
        case STATES.CRACKING: {
            if (timeInState >= CONFIG.CRACK_DURATION_MS) {
                // Placeholder: after cracking go back to BEATING (healing later)
                return { state: STATES.BEATING, stateStartTime: elapsedMs };
            }
            return { state: STATES.CRACKING, stateStartTime };
        }
        case STATES.HEALING: {
            return { state: STATES.HEALING, stateStartTime };
        }
        default:
            return { state: STATES.BEATING, stateStartTime: elapsedMs };
    }
}

/**
 * Render based on current state
 */
function renderState(context, width, height, state, elapsedMs, stateStartTime, baseSize, beatOffset, crackPaths) {
    // Background
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    switch (state) {
        case STATES.BEATING: {
            const { scale, beatsElapsed } = calculateBeatScale(elapsedMs, CONFIG.BPM, CONFIG.BEAT_AMPLITUDE);
            const beatsSinceOffset = beatsElapsed - beatOffset;
            const currentHeartSize = baseSize * scale;
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, currentHeartSize);
            break;
        }
        case STATES.HALTING: {
            // Static heart (no pulse). Could add subtle micro movement later.
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, baseSize);
            break;
        }
        case STATES.CRACKING: {
            // Fill heart then clip cracks to heart interior so they never extend outside
            buildHeartPath(context, width / 2, height / 2, baseSize);
            context.fillStyle = 'rgb(255,20,60)';
            context.fill();
            context.save();
            buildHeartPath(context, width / 2, height / 2, baseSize);
            context.clip();
            const timeInState = elapsedMs - stateStartTime;
            const progress = Math.min(1, timeInState / CONFIG.CRACK_DURATION_MS);
            context.strokeStyle = 'rgba(240,240,240,0.85)';
            context.lineWidth = Math.max(1, baseSize * 0.012);
            crackPaths.forEach(c => c.draw(context, progress));
            context.restore();
            break;
        }
        case STATES.HEALING: {
            context.fillStyle = 'rgb(255,20,60)';
            drawHeart(context, width / 2, height / 2, baseSize);
            break;
        }
    }
}

// Utility: sample heart boundary points for given size
function sampleHeartBoundary(size, samples = 240) {
    const pts = [];
    for (let i = 0; i < samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const xt = 19 * Math.pow(Math.sin(t), 3);
        const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
        pts.push({ x: (xt * size) / 16, y: (yt * size) / 16 });
    }
    return pts;
}

class Crack {
    constructor(start, end, baseSize) {
        this.start = start;
        this.end = end;
        this.baseSize = baseSize;
        this.points = this.generatePoints();
    }
    generatePoints() {
        const steps = random.rangeFloor(CONFIG.CRACK_STEPS_MIN, CONFIG.CRACK_STEPS_MAX);
        const pts = [this.start];
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = this.start.x + (this.end.x - this.start.x) * t;
            const y = this.start.y + (this.end.y - this.start.y) * t;
            // Controlled noise scaled by baseSize (smaller so we stay inside clip)
            const amp = random.range(CONFIG.CRACK_NOISE_AMP_MIN, CONFIG.CRACK_NOISE_AMP_MAX) * (this.baseSize / 320);
            const freq = random.range(CONFIG.CRACK_NOISE_FREQ_MIN, CONFIG.CRACK_NOISE_FREQ_MAX);
            const nx = random.noise2D(x, y, freq, amp);
            const ny = random.noise2D(y, x, freq, amp);
            pts.push({ x: x + nx, y: y + ny });
        }
        pts.push(this.end);
        return pts;
    }
    draw(context, progress) {
        if (progress <= 0) return;
        const visibleCount = Math.max(2, Math.floor(this.points.length * progress));
        context.beginPath();
        context.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < visibleCount; i++) {
            const p = this.points[i];
            context.lineTo(p.x, p.y);
        }
        context.stroke();
    }
}

const sketch = ({ width, height }) => {
    const baseSizeFactor = 0.25;
    const startTime = Date.now();

    // State machine variables
    let currentState = STATES.BEATING;
    let stateStartTime = 0; // millis relative to startTime
    let beatOffset = 0;     // beats consumed prior to current cycle (for counting per phase)
    let crackPaths = [];    // active cracks during CRACKING state
    let boundaryCache = null; // heart boundary points (center-relative)

    return ({ context, width, height }) => {
        const baseSize = Math.min(width, height) * baseSizeFactor;
        const elapsedMs = Date.now() - startTime;
        const { beatsElapsed, beatPhase } = calculateBeatScale(elapsedMs, CONFIG.BPM, CONFIG.BEAT_AMPLITUDE); // reuse to get beatsElapsed
        const beatsSinceOffset = beatsElapsed - beatOffset;
        const timeInState = elapsedMs - stateStartTime;

        // Update state transitions
        const stateUpdate = updateState(currentState, stateStartTime, elapsedMs, beatsSinceOffset, beatPhase, beatsElapsed, timeInState);
        if (stateUpdate.state !== currentState) {
            console.log(`State transition: ${currentState} -> ${stateUpdate.state}`);
            currentState = stateUpdate.state;
            stateStartTime = stateUpdate.stateStartTime;
            if (typeof stateUpdate.setBeatOffsetTo === 'number') {
                // Align beatOffset to the exact beat boundary we transitioned on
                beatOffset = stateUpdate.setBeatOffsetTo;
            }
            if (currentState === STATES.CRACKING) {
                // Generate cracks
                crackPaths = [];
                // Build boundary cache if not existing (scaled to baseSize)
                boundaryCache = sampleHeartBoundary(baseSize, 360);
                const centerX = width / 2;
                const centerY = height / 2;
                for (let i = 0; i < CONFIG.CRACK_COUNT; i++) {
                    // Pick two sufficiently separated boundary indices
                    const idxA = Math.floor(random.range(0, boundaryCache.length));
                    let idxB = Math.floor(random.range(0, boundaryCache.length));
                    const minSeparation = Math.floor(boundaryCache.length * 0.25);
                    let attempts = 0;
                    while (Math.abs(idxB - idxA) < minSeparation && attempts < 20) {
                        idxB = Math.floor(random.range(0, boundaryCache.length));
                        attempts++;
                    }
                    const pA = boundaryCache[idxA];
                    const pB = boundaryCache[idxB];
                    // Convert center-relative to absolute canvas coords
                    const start = { x: centerX + pA.x, y: centerY + pA.y };
                    const end = { x: centerX + pB.x, y: centerY + pB.y };
                    crackPaths.push(new Crack(start, end, baseSize));
                }
            }
            if (currentState !== STATES.CRACKING) {
                crackPaths = [];
            }
        }

        // Render current state
        renderState(context, width, height, currentState, elapsedMs, stateStartTime, baseSize, beatOffset, crackPaths);
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
