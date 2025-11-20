// HardBreaks - Heart breaking and healing animation
// TO RUN (browser dev): canvas-sketch hardbreaks.js --open
import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random.js';
import { Crack, pickCrackEndpoints } from './cracks.js';

// State machine states
const STATES = {
  BEATING: 'BEATING',
  HALTING: 'HALTING',
  CRACKING: 'CRACKING',
  HEALING: 'HEALING',
  COMPLETE: 'COMPLETE'
};

// Configuration generation - combines fixed and randomized parameters
function generateConfig() {
  return {
    // Fixed timing parameters
    BPM: random.rangeFloor(50, 120),  // heart beats per minute in BEATING state
    BEAT_AMPLITUDE: random.range(0.1, 0.35),     // % enlargement at peak
    CRACK_COUNT: random.rangeFloor(1, 3),         // number of cracks to generate
    CRACK_STEPS_MIN: 12,
    CRACK_STEPS_MAX: 28,
    CRACK_NOISE_FREQ_MIN: 30,
    CRACK_NOISE_FREQ_MAX: 120,
    CRACK_NOISE_AMP_MIN: 8,
    CRACK_NOISE_AMP_MAX: 45,
    CRACK_COLOR: 'rgba(0,0,0,0.95)', // darker fracture color
    BEATS_BEFORE_HALTING: random.rangeFloor(5, 20),  // number of full beats before halting
    CRACK_DURATION_MS: random.rangeFloor(1000, 14000),  // duration of crack growth animation
    HALT_DURATION_MS: random.rangeFloor(500, 3000),   // how long to stay halted (ms)
    HEALING_DURATION_MS: random.rangeFloor(1000, 14000), // duration of healing (crack fade-out)
    MAX_SMALL_CYCLES: random.rangeFloor(2, 6),       // number of small cycles before big cycle reset
    SCAR_FADE_DURATION_MS: random.rangeFloor(3000, 8000), // time to fade out previous cycle's displacement/color
    BASE_SIZE_FACTOR: random.range(0.1, 0.4),   // base heart size as fraction of canvas
    CRACK_LINE_WIDTH_FACTOR: random.range(0.03, 0.18), // crack thickness
    COMPLETE_DURATION_MS: 4321, // pause duration at completion before reset
  };
}

// Initial configuration
let CONFIG = generateConfig();


// Color palette generation
function generateHeartColor() {
  // Generate vibrant heart colors with more variety
  const colorPalettes = [
    // Classic reds
    () => ({ r: random.rangeFloor(200, 255), g: random.rangeFloor(10, 40), b: random.rangeFloor(40, 80) }),
    () => ({ r: random.rangeFloor(180, 230), g: random.rangeFloor(20, 50), b: random.rangeFloor(20, 60) }),
    // Pinks
    () => ({ r: random.rangeFloor(220, 255), g: random.rangeFloor(60, 120), b: random.rangeFloor(120, 180) }),
    () => ({ r: random.rangeFloor(255, 255), g: random.rangeFloor(100, 150), b: random.rangeFloor(150, 200) }),
    // Oranges
    () => ({ r: random.rangeFloor(230, 255), g: random.rangeFloor(80, 150), b: random.rangeFloor(0, 60) }),
    () => ({ r: random.rangeFloor(255, 255), g: random.rangeFloor(120, 180), b: random.rangeFloor(30, 80) }),
    // Deep purples
    () => ({ r: random.rangeFloor(120, 180), g: random.rangeFloor(20, 60), b: random.rangeFloor(140, 200) }),
    () => ({ r: random.rangeFloor(100, 150), g: random.rangeFloor(30, 70), b: random.rangeFloor(160, 220) }),
    // Magentas
    () => ({ r: random.rangeFloor(200, 255), g: random.rangeFloor(0, 80), b: random.rangeFloor(150, 220) }),
    () => ({ r: random.rangeFloor(220, 255), g: random.rangeFloor(20, 60), b: random.rangeFloor(180, 240) }),
    // Coral/Salmon
    () => ({ r: random.rangeFloor(240, 255), g: random.rangeFloor(100, 140), b: random.rangeFloor(100, 130) }),
    // Hot pink
    () => ({ r: random.rangeFloor(240, 255), g: random.rangeFloor(40, 90), b: random.rangeFloor(140, 180) }),
    // Crimson
    () => ({ r: random.rangeFloor(180, 220), g: random.rangeFloor(10, 30), b: random.rangeFloor(50, 90) }),
    // Violet
    () => ({ r: random.rangeFloor(140, 190), g: random.rangeFloor(60, 100), b: random.rangeFloor(180, 230) }),
  ];

  const palette = random.pick(colorPalettes);
  return palette();
}

function generateCrackColor(heartColor) {
  // Generate contrasting crack color based on heart color
  const brightness = (heartColor.r + heartColor.g + heartColor.b) / 3;

  if (brightness > 150) {
    // Heart is bright - use contrasting cracks (dark or vibrant)
    if (random.value() < 0.6) {
      // 60% chance: Dark cracks
      return {
        r: random.rangeFloor(0, 40),
        g: random.rangeFloor(0, 40),
        b: random.rangeFloor(0, 60)
      };
    } else {
      // 40% chance: Vibrant contrasting cracks (reds, cyans, magentas, etc.)
      const vibrantOptions = [
        () => ({ r: random.rangeFloor(180, 255), g: random.rangeFloor(0, 40), b: random.rangeFloor(0, 60) }), // red
        () => ({ r: random.rangeFloor(0, 60), g: random.rangeFloor(180, 255), b: random.rangeFloor(180, 255) }), // cyan
        () => ({ r: random.rangeFloor(180, 255), g: random.rangeFloor(0, 60), b: random.rangeFloor(180, 255) }), // magenta
        () => ({ r: random.rangeFloor(180, 255), g: random.rangeFloor(140, 200), b: random.rangeFloor(0, 60) }), // orange
      ];
      return random.pick(vibrantOptions)();
    }
  } else {
    // Heart is dark - use bright/complementary cracks
    const complementaryHue = [
      255 - heartColor.r + random.rangeFloor(-30, 30),
      255 - heartColor.g + random.rangeFloor(-30, 30),
      255 - heartColor.b + random.rangeFloor(-30, 30)
    ];

    return {
      r: Math.max(180, Math.min(255, complementaryHue[0])),
      g: Math.max(180, Math.min(255, complementaryHue[1])),
      b: Math.max(180, Math.min(255, complementaryHue[2]))
    };
  }
}

function colorToRgbString(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

function colorToRgbaString(color, alpha) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

function generateHeartShapeParams() {
  return {
    width: random.range(13, 18),
    roundness: random.range(4, 7),
    bottom: random.range(0.2, 1)
  };
}

let heartShape_width = 13 // randomized per big cycle: 13-18
let heartShape_roundness = 5 // randomized per big cycle: 4-7
let heartShape_bottom = 1 // randomized per big cycle: 0.2-1
function drawHeart(context, cx, cy, size) {
  context.beginPath();
  for (let t = 0; t < Math.PI * 2; t += 0.08) {
    const xt = 19 * Math.pow(Math.sin(t), 3);
    const yt = -(heartShape_width * Math.cos(t) - heartShape_roundness * Math.cos(2 * t) - 3 * Math.cos(3 * t) - heartShape_bottom * Math.cos(4 * t));
    const x = cx + (xt * size) / 16;
    const y = cy + (yt * size) / 16;
    if (t === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

// Draw heart with displacement (for healing expansion)
function drawHeartWithDisplacement(context, cx, cy, size, crackPaths, healProgress) {
  context.beginPath();
  const segments = 180;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const xt = 19 * Math.pow(Math.sin(t), 3);
    const yt = -(heartShape_width * Math.cos(t) - heartShape_roundness * Math.cos(2 * t) - 3 * Math.cos(3 * t) - heartShape_bottom * Math.cos(4 * t));

    // Base point on heart boundary
    const basePoint = { x: cx + (xt * size) / 16, y: cy + (yt * size) / 16 };

    // Calculate total displacement from all cracks
    let displacement = 0;
    crackPaths.forEach(crack => {
      displacement += crack.getDisplacementAt(basePoint, healProgress, { x: cx, y: cy });
    });

    // Apply displacement radially outward from center
    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const x = basePoint.x + Math.cos(angle) * displacement;
    const y = basePoint.y + Math.sin(angle) * displacement;

    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.closePath();
  context.fill();
}

// Draw heart combining accumulated displacement AND current healing displacement
function drawHeartWithCombinedDisplacement(context, cx, cy, size, crackPaths, healProgress, boundaryCache, accumulatedDisplacements, baseSizeUsedForCache) {
  context.beginPath();

  if (!boundaryCache || accumulatedDisplacements.length === 0) {
    // No accumulated displacement - fall back to regular healing displacement
    drawHeartWithDisplacement(context, cx, cy, size, crackPaths, healProgress);
    return;
  }

  const scaleFactor = baseSizeUsedForCache ? size / baseSizeUsedForCache : 1;

  for (let i = 0; i < boundaryCache.length; i++) {
    // Start with base boundary point (scaled)
    const basePoint = {
      x: cx + boundaryCache[i].x * scaleFactor,
      y: cy + boundaryCache[i].y * scaleFactor
    };

    // Add accumulated displacement from previous cycles (scaled)
    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const accumulatedDisp = accumulatedDisplacements[i] * scaleFactor;
    const displacedPoint = {
      x: basePoint.x + Math.cos(angle) * accumulatedDisp,
      y: basePoint.y + Math.sin(angle) * accumulatedDisp
    };

    // Add current crack displacement
    let currentDisplacement = 0;
    crackPaths.forEach(crack => {
      currentDisplacement += crack.getDisplacementAt(displacedPoint, healProgress, { x: cx, y: cy });
    });

    // Final position combines both displacements
    const finalX = displacedPoint.x + Math.cos(angle) * currentDisplacement;
    const finalY = displacedPoint.y + Math.sin(angle) * currentDisplacement;

    if (i === 0) context.moveTo(finalX, finalY);
    else context.lineTo(finalX, finalY);
  }

  context.closePath();
  context.fill();
}

// Draw heart with accumulated displacements from previous cycles
function drawHeartWithAccumulatedDisplacement(context, cx, cy, size, boundaryCache, accumulatedDisplacements, baseSizeUsedForCache) {
  if (!boundaryCache || accumulatedDisplacements.length === 0) {
    // Fallback to regular heart if no displacements accumulated yet
    drawHeart(context, cx, cy, size);
    return;
  }

  // Calculate scale factor between requested size and the size used to create the cache
  const scaleFactor = baseSizeUsedForCache ? size / baseSizeUsedForCache : 1;

  context.beginPath();
  for (let i = 0; i < boundaryCache.length; i++) {
    const basePoint = {
      x: cx + boundaryCache[i].x * scaleFactor,
      y: cy + boundaryCache[i].y * scaleFactor
    };

    // Apply accumulated displacement radially outward (also scaled)
    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const displacement = accumulatedDisplacements[i] * scaleFactor;
    const x = basePoint.x + Math.cos(angle) * displacement;
    const y = basePoint.y + Math.sin(angle) * displacement;

    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.closePath();
  context.fill();
}

// Build heart path with displacement (for clipping during healing)
function buildHeartPathWithDisplacement(context, cx, cy, size, crackPaths, healProgress) {
  context.beginPath();
  const segments = 180;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const xt = 19 * Math.pow(Math.sin(t), 3);
    const yt = -(heartShape_width * Math.cos(t) - heartShape_roundness * Math.cos(2 * t) - 3 * Math.cos(3 * t) - heartShape_bottom * Math.cos(4 * t));

    // Base point on heart boundary
    const basePoint = { x: cx + (xt * size) / 16, y: cy + (yt * size) / 16 };

    // Calculate total displacement from all cracks
    let displacement = 0;
    crackPaths.forEach(crack => {
      displacement += crack.getDisplacementAt(basePoint, healProgress, { x: cx, y: cy });
    });

    // Apply displacement radially outward from center
    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const x = basePoint.x + Math.cos(angle) * displacement;
    const y = basePoint.y + Math.sin(angle) * displacement;

    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.closePath();
}

// Build heart path combining accumulated displacement AND current healing displacement (for clipping)
function buildHeartPathWithCombinedDisplacement(context, cx, cy, size, crackPaths, healProgress, boundaryCache, accumulatedDisplacements, baseSizeUsedForCache) {
  if (!boundaryCache || accumulatedDisplacements.length === 0) {
    buildHeartPathWithDisplacement(context, cx, cy, size, crackPaths, healProgress);
    return;
  }

  context.beginPath();
  const scaleFactor = baseSizeUsedForCache ? size / baseSizeUsedForCache : 1;

  for (let i = 0; i < boundaryCache.length; i++) {
    const basePoint = {
      x: cx + boundaryCache[i].x * scaleFactor,
      y: cy + boundaryCache[i].y * scaleFactor
    };

    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const accumulatedDisp = accumulatedDisplacements[i] * scaleFactor;
    const displacedPoint = {
      x: basePoint.x + Math.cos(angle) * accumulatedDisp,
      y: basePoint.y + Math.sin(angle) * accumulatedDisp
    };

    let currentDisplacement = 0;
    crackPaths.forEach(crack => {
      currentDisplacement += crack.getDisplacementAt(displacedPoint, healProgress, { x: cx, y: cy });
    });

    const finalX = displacedPoint.x + Math.cos(angle) * currentDisplacement;
    const finalY = displacedPoint.y + Math.sin(angle) * currentDisplacement;

    if (i === 0) context.moveTo(finalX, finalY);
    else context.lineTo(finalX, finalY);
  }

  context.closePath();
}

// Build heart path (no fill) for clipping or stroke operations
function buildHeartPath(context, cx, cy, size) {
  context.beginPath();
  for (let t = 0; t < Math.PI * 2; t += 0.05) {
    const xt = 19 * Math.pow(Math.sin(t), 3);
    const yt = -(heartShape_width * Math.cos(t) - heartShape_roundness * Math.cos(2 * t) - 3 * Math.cos(3 * t) - heartShape_bottom * Math.cos(4 * t));
    const x = cx + (xt * size) / 16;
    const y = cy + (yt * size) / 16;
    if (t === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
}

// Build heart path with accumulated displacements (for clipping)
function buildHeartPathWithAccumulatedDisplacement(context, cx, cy, size, boundaryCache, accumulatedDisplacements, baseSizeUsedForCache) {
  if (!boundaryCache || accumulatedDisplacements.length === 0) {
    buildHeartPath(context, cx, cy, size);
    return;
  }

  // Calculate scale factor between requested size and the size used to create the cache
  const scaleFactor = baseSizeUsedForCache ? size / baseSizeUsedForCache : 1;

  context.beginPath();
  for (let i = 0; i < boundaryCache.length; i++) {
    const basePoint = {
      x: cx + boundaryCache[i].x * scaleFactor,
      y: cy + boundaryCache[i].y * scaleFactor
    };

    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const displacement = accumulatedDisplacements[i] * scaleFactor;
    const x = basePoint.x + Math.cos(angle) * displacement;
    const y = basePoint.y + Math.sin(angle) * displacement;

    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.closePath();
}

/**
 * Calculate beat scale based on elapsed time with realistic double-pulse (lub-dub) pattern
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

  // Very gentle two-pulse heartbeat pattern (lub-dub)
  // Extra smooth for LED display
  let pulse = 0;

  if (beatPhase < 0.4) {
    // Resting phase before first pulse
    pulse = 0;
  } else if (beatPhase < 0.68) {
    // First pulse (lub) - very gentle rise and fall
    const lubPhase = (beatPhase - 0.4) / 0.28; // 0 to 1 over 28% of beat
    // Double smoothstep for extra gentleness: 6t⁵ - 15t⁴ + 10t³
    const smoothLub = lubPhase * lubPhase * lubPhase * (lubPhase * (lubPhase * 6 - 15) + 10);
    pulse = Math.sin(smoothLub * Math.PI) * 0.24; // 30% of full amplitude
  } else if (beatPhase < 0.7) {
    // Brief pause between pulses
    pulse = 0;
  } else if (beatPhase < 0.98) {
    // Second pulse (dub) - slightly larger but still very gentle
    const dubPhase = (beatPhase - 0.7) / 0.28; // 0 to 1 over 28% of beat
    // Double smoothstep for extra gentleness
    const smoothDub = dubPhase * dubPhase * dubPhase * (dubPhase * (dubPhase * 6 - 15) + 10);
    pulse = Math.sin(smoothDub * Math.PI) * 0.32; // 42% of full amplitude
  } else {
    // Resting phase after second pulse
    pulse = 0;
  }

  return { scale: 1 + amplitude * pulse, beatsElapsed, beatPhase };
}/**
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
        // Transition to healing after cracks finish growing
        return { state: STATES.HEALING, stateStartTime: elapsedMs };
      }
      return { state: STATES.CRACKING, stateStartTime };
    }
    case STATES.HEALING: {
      if (timeInState >= CONFIG.HEALING_DURATION_MS) {
        // After healing completes, check if we should go to COMPLETE or continue with another cycle
        return { state: STATES.BEATING, stateStartTime: elapsedMs, resetBeatOffset: true, checkCycleComplete: true };
      }
      return { state: STATES.HEALING, stateStartTime };
    }
    case STATES.COMPLETE: {
      if (timeInState >= CONFIG.COMPLETE_DURATION_MS) {
        // After completion pause, reset everything and start fresh
        return { state: STATES.BEATING, stateStartTime: elapsedMs, resetBeatOffset: true, resetBigCycle: true };
      }
      return { state: STATES.COMPLETE, stateStartTime };
    }
    default:
      return { state: STATES.BEATING, stateStartTime: elapsedMs };
  }
}

/**
 * Render based on current state
 */
function renderState(context, width, height, state, elapsedMs, stateStartTime, baseSize, beatOffset, crackPaths, boundaryCache, accumulatedDisplacements, fadingCracks, scarFadeStartTime, heartColorString, crackColorString) {
  // Background
  context.fillStyle = 'black';
  context.fillRect(0, 0, width, height);

  // Calculate scar fade progress (for smooth transition after healing)
  const scarFadeProgress = scarFadeStartTime > 0
    ? Math.min(1, (elapsedMs - scarFadeStartTime) / CONFIG.SCAR_FADE_DURATION_MS)
    : 1;
  const scarFadeAmount = 1 - scarFadeProgress; // 1 at start, 0 when fully faded

  // Debug: log fade progress occasionally
  if (scarFadeStartTime > 0 && Math.random() < 0.02) { // ~2% of frames
    console.log(`Scar fade - progress: ${scarFadeProgress.toFixed(3)}, amount: ${scarFadeAmount.toFixed(3)}, elapsed: ${(elapsedMs - scarFadeStartTime).toFixed(0)}ms / ${CONFIG.SCAR_FADE_DURATION_MS}ms`);
  }

  switch (state) {
    case STATES.BEATING: {
      const { scale, beatsElapsed } = calculateBeatScale(elapsedMs, CONFIG.BPM, CONFIG.BEAT_AMPLITUDE);
      const beatsSinceOffset = beatsElapsed - beatOffset;
      const currentHeartSize = baseSize * scale;
      const cx = width / 2;
      const cy = height / 2;
      const scaleFactor = currentHeartSize / baseSize;

      context.fillStyle = heartColorString;

      // If we have fading cracks, render heart with combined displacement
      if (fadingCracks.length > 0 && scarFadeAmount > 0.01) {
        // Build combined path with accumulated + fading displacement
        context.beginPath();
        for (let i = 0; i < boundaryCache.length; i++) {
          const basePoint = {
            x: cx + boundaryCache[i].x * scaleFactor,
            y: cy + boundaryCache[i].y * scaleFactor
          };

          const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
          const accumulatedDisp = accumulatedDisplacements[i] * scaleFactor;
          const displacedPoint = {
            x: basePoint.x + Math.cos(angle) * accumulatedDisp,
            y: basePoint.y + Math.sin(angle) * accumulatedDisp
          };

          // Add fading crack displacement
          let fadingDisplacement = 0;
          fadingCracks.forEach(crack => {
            fadingDisplacement += crack.getDisplacementAt(displacedPoint, 1.0, { x: cx, y: cy });
          });
          fadingDisplacement *= scarFadeAmount;

          const finalX = displacedPoint.x + Math.cos(angle) * fadingDisplacement;
          const finalY = displacedPoint.y + Math.sin(angle) * fadingDisplacement;

          if (i === 0) context.moveTo(finalX, finalY);
          else context.lineTo(finalX, finalY);
        }
        context.closePath();
        context.fill();

        // Now draw the fading healing scars on top, scaled with the heart
        context.save();
        // Clip to the displaced heart shape
        context.beginPath();
        for (let i = 0; i < boundaryCache.length; i++) {
          const basePoint = {
            x: cx + boundaryCache[i].x * scaleFactor,
            y: cy + boundaryCache[i].y * scaleFactor
          };

          const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
          const accumulatedDisp = accumulatedDisplacements[i] * scaleFactor;
          const displacedPoint = {
            x: basePoint.x + Math.cos(angle) * accumulatedDisp,
            y: basePoint.y + Math.sin(angle) * accumulatedDisp
          };

          let fadingDisplacement = 0;
          fadingCracks.forEach(crack => {
            fadingDisplacement += crack.getDisplacementAt(displacedPoint, 1.0, { x: cx, y: cy });
          });
          fadingDisplacement *= scarFadeAmount;

          const finalX = displacedPoint.x + Math.cos(angle) * fadingDisplacement;
          const finalY = displacedPoint.y + Math.sin(angle) * fadingDisplacement;

          if (i === 0) context.moveTo(finalX, finalY);
          else context.lineTo(finalX, finalY);
        }
        context.closePath();
        context.clip();

        // Apply scaling transform so cracks scale with the heart
        context.translate(cx, cy);
        context.scale(scaleFactor, scaleFactor);
        context.translate(-cx, -cy);

        // Draw fading healing material
        const healingAlpha = scarFadeAmount * 0.8; // fade opacity
        context.globalAlpha = healingAlpha;

        fadingCracks.forEach(crack => {
          crack.drawHealing(context, 1.0); // fully healed
        });

        context.restore();
      } else {
        // Normal rendering without fading
        context.fillStyle = heartColorString;
        if (accumulatedDisplacements.length > 0) {
          drawHeartWithAccumulatedDisplacement(context, cx, cy, currentHeartSize, boundaryCache, accumulatedDisplacements, baseSize);
        } else {
          drawHeart(context, cx, cy, currentHeartSize);
        }
      }

      break;
    }
    case STATES.HALTING: {
      // Static heart (no pulse). Apply accumulated displacements.
      context.fillStyle = heartColorString;
      if (accumulatedDisplacements.length > 0) {
        drawHeartWithAccumulatedDisplacement(context, width / 2, height / 2, baseSize, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        drawHeart(context, width / 2, height / 2, baseSize);
      }
      break;
    }
    case STATES.CRACKING: {
      // Fill heart then clip cracks to heart interior so they never extend outside
      context.fillStyle = heartColorString;
      if (accumulatedDisplacements.length > 0) {
        drawHeartWithAccumulatedDisplacement(context, width / 2, height / 2, baseSize, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        buildHeartPath(context, width / 2, height / 2, baseSize);
        context.fill();
      }
      context.save();
      // Use accumulated displacement for clipping too
      if (accumulatedDisplacements.length > 0) {
        buildHeartPathWithAccumulatedDisplacement(context, width / 2, height / 2, baseSize, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        buildHeartPath(context, width / 2, height / 2, baseSize);
      }
      context.clip();
      const timeInState = elapsedMs - stateStartTime;
      const progress = Math.min(1, timeInState / CONFIG.CRACK_DURATION_MS);
      context.strokeStyle = crackColorString;
      context.lineWidth = Math.max(1, baseSize * CONFIG.CRACK_LINE_WIDTH_FACTOR);
      crackPaths.forEach(c => c.draw(context, progress));
      context.restore();
      break;
    }
    case STATES.HEALING: {
      // Draw heart with displacement and healing material
      const timeInState = elapsedMs - stateStartTime;
      const healProgress = Math.min(1, timeInState / CONFIG.HEALING_DURATION_MS);

      // Draw displaced heart (combining accumulated + current displacement)
      context.fillStyle = heartColorString;
      if (accumulatedDisplacements.length > 0) {
        drawHeartWithCombinedDisplacement(context, width / 2, height / 2, baseSize, crackPaths, healProgress, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        drawHeartWithDisplacement(context, width / 2, height / 2, baseSize, crackPaths, healProgress);
      }

      // Clip to displaced heart boundary for healing material and cracks
      context.save();
      if (accumulatedDisplacements.length > 0) {
        buildHeartPathWithCombinedDisplacement(context, width / 2, height / 2, baseSize, crackPaths, healProgress, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        buildHeartPathWithDisplacement(context, width / 2, height / 2, baseSize, crackPaths, healProgress);
      }
      context.clip();

      // Draw healing material (yellow fill growing along cracks)
      crackPaths.forEach(c => c.drawHealing(context, healProgress));

      // Draw fading cracks on top of healing material
      const crackAlpha = Math.max(0, 1 - healProgress * 1.5); // fade faster than heal grows
      if (crackAlpha > 0.01) {
        const baseColor = crackColorString.match(/rgba?\(([^)]+)\)/)?.[1] || '0,0,0,0.95';
        const [r, g, b] = baseColor.split(',').map(v => parseFloat(v.trim()));
        context.strokeStyle = `rgba(${r},${g},${b},${crackAlpha * 0.95})`;
        context.lineWidth = Math.max(1, baseSize * CONFIG.CRACK_LINE_WIDTH_FACTOR);
        crackPaths.forEach(c => c.draw(context, 1.0));
      }

      context.restore();
      break;
    }
    case STATES.COMPLETE: {
      // Show final enlarged, scarred heart with all accumulated displacement
      context.fillStyle = heartColorString;
      if (accumulatedDisplacements.length > 0) {
        drawHeartWithAccumulatedDisplacement(context, width / 2, height / 2, baseSize, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        drawHeart(context, width / 2, height / 2, baseSize);
      }
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
    const yt = -(heartShape_width * Math.cos(t) - heartShape_roundness * Math.cos(2 * t) - 3 * Math.cos(3 * t) - heartShape_bottom * Math.cos(4 * t));
    pts.push({ x: (xt * size) / 16, y: (yt * size) / 16 });
  }
  return pts;
}

// Utility: sample displaced heart boundary (applies accumulated displacement)
function sampleDisplacedBoundary(cx, cy, boundaryCache, accumulatedDisplacements) {
  if (!boundaryCache || accumulatedDisplacements.length === 0) {
    return null;
  }

  const pts = [];
  for (let i = 0; i < boundaryCache.length; i++) {
    const basePoint = {
      x: cx + boundaryCache[i].x,
      y: cy + boundaryCache[i].y
    };

    const angle = Math.atan2(basePoint.y - cy, basePoint.x - cx);
    const displacement = accumulatedDisplacements[i];
    const x = basePoint.x + Math.cos(angle) * displacement;
    const y = basePoint.y + Math.sin(angle) * displacement;

    pts.push({ x, y });
  }
  return pts;
}

// Crack class moved to ./cracks.js for reuse & testing

const sketch = ({ width, height }) => {
  const startTime = Date.now();

  // State machine variables
  let currentState = STATES.BEATING;
  let stateStartTime = 0; // millis relative to startTime
  let beatOffset = 0;     // beats consumed prior to current cycle (for counting per phase)
  let crackPaths = [];    // active cracks during CRACKING state
  let boundaryCache = null; // heart boundary points (center-relative)
  let accumulatedDisplacements = []; // displacement per boundary point (persists across cycles)

  // Scar fade tracking (for smooth transition after healing)
  let fadingCracks = [];  // cracks from previous cycle that are fading out
  let scarFadeStartTime = 0; // when the scar fade started

  // Cycle tracking
  let smallCycleCount = 0; // How many small cycles completed (0 to MAX_SMALL_CYCLES)
  let sizeGrowthMultiplier = 1.0; // Accumulates 5% growth per cycle

  // Color configuration (randomized per big cycle)
  let heartColor = generateHeartColor();
  let crackColor = generateCrackColor(heartColor);
  let heartColorString = colorToRgbString(heartColor);
  let crackColorString = colorToRgbaString(crackColor, 0.95);

  return ({ context, width, height }) => {
    const baseSize = Math.min(width, height) * CONFIG.BASE_SIZE_FACTOR;
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

      // Reset beat offset when requested (HEALING->BEATING or COMPLETE->BEATING)
      if (stateUpdate.resetBeatOffset) {
        beatOffset = Math.floor(beatsElapsed);
        console.log(`Reset beatOffset to ${beatOffset}`);
      }

      if (typeof stateUpdate.setBeatOffsetTo === 'number') {
        // Align beatOffset to the exact beat boundary we transitioned on
        beatOffset = stateUpdate.setBeatOffsetTo;
      }

      // Handle big cycle reset (after COMPLETE state)
      if (stateUpdate.resetBigCycle) {
        console.log('Big cycle complete - resetting to symmetric heart');
        smallCycleCount = 0;
        accumulatedDisplacements = [];
        boundaryCache = null;

        // Regenerate CONFIG with new random parameters
        CONFIG = generateConfig();

        // Generate new random colors for next big cycle
        heartColor = generateHeartColor();
        crackColor = generateCrackColor(heartColor);
        heartColorString = colorToRgbString(heartColor);
        crackColorString = colorToRgbaString(crackColor, 0.95);

        // Generate new random heart shape parameters
        const shapeParams = generateHeartShapeParams();
        ({ width: heartShape_width, roundness: heartShape_roundness, bottom: heartShape_bottom } = shapeParams);

        console.log(`New colors - Heart: ${heartColorString}, Crack: ${crackColorString}`);
        console.log(`New heart shape - width: ${heartShape_width.toFixed(2)}, roundness: ${heartShape_roundness.toFixed(2)}, bottom: ${heartShape_bottom.toFixed(2)}`);
        console.log(`New config - BPM: ${CONFIG.BPM}, BASE_SIZE_FACTOR: ${CONFIG.BASE_SIZE_FACTOR.toFixed(3)}, CRACK_LINE_WIDTH_FACTOR: ${CONFIG.CRACK_LINE_WIDTH_FACTOR.toFixed(3)}`);
      }

      if (currentState === STATES.CRACKING) {
        // Generate cracks
        crackPaths = [];
        const centerX = width / 2;
        const centerY = height / 2;

        // Build boundary cache if not existing (scaled to baseSize)
        if (!boundaryCache) {
          boundaryCache = sampleHeartBoundary(baseSize, 360);
          accumulatedDisplacements = new Array(boundaryCache.length).fill(0);
        }

        // Get the actual boundary to sample from (displaced if we have accumulated displacement)
        const hasDisplacement = accumulatedDisplacements.length > 0 && accumulatedDisplacements.some(d => d !== 0);
        console.log(`Generating cracks - hasDisplacement: ${hasDisplacement}, accumulatedDisplacements samples:`,
          accumulatedDisplacements.length > 0 ? accumulatedDisplacements.slice(0, 5) : 'empty');

        const actualBoundary = hasDisplacement
          ? sampleDisplacedBoundary(centerX, centerY, boundaryCache, accumulatedDisplacements)
          : boundaryCache.map(pt => ({ x: centerX + pt.x, y: centerY + pt.y }));

        for (let i = 0; i < CONFIG.CRACK_COUNT; i++) {
          // Pick two sufficiently separated boundary indices
          const idxA = Math.floor(random.range(0, actualBoundary.length));
          let idxB = Math.floor(random.range(0, actualBoundary.length));
          const minSeparation = Math.floor(actualBoundary.length * 0.5);
          let attempts = 0;
          while (Math.abs(idxB - idxA) < minSeparation && attempts < 20) {
            idxB = Math.floor(random.range(0, actualBoundary.length));
            attempts++;
          }
          // Pick endpoints directly from actual (displaced) boundary
          const start = actualBoundary[idxA];
          const end = actualBoundary[idxB];
          crackPaths.push(new Crack(start, end, baseSize, CONFIG));
        }
      }
      // Accumulate displacements after HEALING completes
      if (currentState === STATES.BEATING && crackPaths.length > 0) {
        // Just transitioned from HEALING to BEATING - accumulate displacement
        smallCycleCount++;
        console.log(`Small cycle ${smallCycleCount}/${CONFIG.MAX_SMALL_CYCLES} completed`);


        // Store cracks for fading
        fadingCracks = crackPaths.slice(); // copy array
        scarFadeStartTime = elapsedMs;

        const centerX = width / 2;
        const centerY = height / 2;
        for (let i = 0; i < boundaryCache.length; i++) {
          const basePoint = {
            x: centerX + boundaryCache[i].x,
            y: centerY + boundaryCache[i].y
          };
          let newDisplacement = 0;
          crackPaths.forEach(crack => {
            newDisplacement += crack.getDisplacementAt(basePoint, 1.0, { x: centerX, y: centerY });
          });
          accumulatedDisplacements[i] += newDisplacement;
        }
        console.log(`Accumulated displacements - samples:`, accumulatedDisplacements.slice(0, 5));
        crackPaths = []; // Clear cracks after accumulation

        // Check if we've completed all small cycles - if so, override transition to COMPLETE
        if (stateUpdate.checkCycleComplete && smallCycleCount >= CONFIG.MAX_SMALL_CYCLES) {
          console.log('All small cycles complete - transitioning to COMPLETE state');
          currentState = STATES.COMPLETE;
          stateStartTime = elapsedMs;
        }
      }

      // Keep cracks during HEALING so they can fade out
      if (currentState !== STATES.CRACKING && currentState !== STATES.HEALING && crackPaths.length > 0) {
        crackPaths = [];
      }
    }

    // Clear fading cracks after they've fully faded
    if (fadingCracks.length > 0 && scarFadeStartTime > 0) {
      const fadeProgress = Math.min(1, (elapsedMs - scarFadeStartTime) / CONFIG.SCAR_FADE_DURATION_MS);
      if (fadeProgress >= 1) {
        fadingCracks = [];
        scarFadeStartTime = 0;
      }
    }

    // Render current state
    renderState(context, width, height, currentState, elapsedMs, stateStartTime, baseSize, beatOffset, crackPaths, boundaryCache, accumulatedDisplacements, fadingCracks, scarFadeStartTime, heartColorString, crackColorString);
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
