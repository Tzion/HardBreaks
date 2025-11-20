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

// Configuration for timing (will expand later per phase)
const CONFIG = {
  BPM: 50,                  // heart beats per minute in BEATING state
  BEATS_BEFORE_HALTING: 2,  // number of full beats before halting
  HALT_DURATION_MS: 1500,   // how long to stay halted (ms)
  BEAT_AMPLITUDE: 0.25,     // 25% enlargement at peak
  CRACK_COUNT: 2,           // number of cracks to generate
  CRACK_DURATION_MS: 2800,  // duration of crack growth animation
  CRACK_STEPS_MIN: 12,
  CRACK_STEPS_MAX: 28,
  CRACK_NOISE_FREQ_MIN: 30,
  CRACK_NOISE_FREQ_MAX: 120,
  CRACK_NOISE_AMP_MIN: 8,
  CRACK_NOISE_AMP_MAX: 45,
  CRACK_LINE_WIDTH_FACTOR: 0.1, // wider cracks
  CRACK_COLOR: 'rgba(0,0,0,0.95)', // darker fracture color
  HEALING_DURATION_MS: 20000, // duration of healing (crack fade-out)
  COMPLETE_DURATION_MS: 3000, // pause duration at completion before reset
  MAX_SMALL_CYCLES: 4        // number of small cycles before big cycle reset
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

// Draw heart with displacement (for healing expansion)
function drawHeartWithDisplacement(context, cx, cy, size, crackPaths, healProgress) {
  context.beginPath();
  const segments = 180;
  
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const xt = 19 * Math.pow(Math.sin(t), 3);
    const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
    
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
    const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
    
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
    const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
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
function renderState(context, width, height, state, elapsedMs, stateStartTime, baseSize, beatOffset, crackPaths, boundaryCache, accumulatedDisplacements) {
  // Background
  context.fillStyle = 'black';
  context.fillRect(0, 0, width, height);

  switch (state) {
    case STATES.BEATING: {
      const { scale, beatsElapsed } = calculateBeatScale(elapsedMs, CONFIG.BPM, CONFIG.BEAT_AMPLITUDE);
      const beatsSinceOffset = beatsElapsed - beatOffset;
      const currentHeartSize = baseSize * scale;
      context.fillStyle = 'rgb(255,20,60)';
      // Use accumulated displacement if available
      if (accumulatedDisplacements.length > 0) {
        drawHeartWithAccumulatedDisplacement(context, width / 2, height / 2, currentHeartSize, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        drawHeart(context, width / 2, height / 2, currentHeartSize);
      }
      break;
    }
    case STATES.HALTING: {
      // Static heart (no pulse). Apply accumulated displacements.
      context.fillStyle = 'rgb(255,20,60)';
      if (accumulatedDisplacements.length > 0) {
        drawHeartWithAccumulatedDisplacement(context, width / 2, height / 2, baseSize, boundaryCache, accumulatedDisplacements, baseSize);
      } else {
        drawHeart(context, width / 2, height / 2, baseSize);
      }
      break;
    }
    case STATES.CRACKING: {
      // Fill heart then clip cracks to heart interior so they never extend outside
      context.fillStyle = 'rgb(255,20,60)';
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
      context.strokeStyle = CONFIG.CRACK_COLOR;
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
      context.fillStyle = 'rgb(255,20,60)';
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
        const baseColor = CONFIG.CRACK_COLOR.match(/rgba?\(([^)]+)\)/)?.[1] || '0,0,0,0.95';
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
      context.fillStyle = 'rgb(255,20,60)';
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
    const yt = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t) - 1 * Math.cos(4 * t));
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
  const baseSizeFactor = 0.35;
  const startTime = Date.now();

  // State machine variables
  let currentState = STATES.BEATING;
  let stateStartTime = 0; // millis relative to startTime
  let beatOffset = 0;     // beats consumed prior to current cycle (for counting per phase)
  let crackPaths = [];    // active cracks during CRACKING state
  let boundaryCache = null; // heart boundary points (center-relative)
  let accumulatedDisplacements = []; // displacement per boundary point (persists across cycles)
  
  // Cycle tracking
  let smallCycleCount = 0; // How many small cycles completed (0 to MAX_SMALL_CYCLES)

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

    // Render current state
    renderState(context, width, height, currentState, elapsedMs, stateStartTime, baseSize, beatOffset, crackPaths, boundaryCache, accumulatedDisplacements);
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
