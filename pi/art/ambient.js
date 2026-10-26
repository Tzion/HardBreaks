// ambient.js - Ambient light animations for 49x39 LED matrix
// Cycles through 4 scenes: aurora, embers, ocean, midnight, all in pinks (hue ~315-355)
// TO RUN (browser dev): canvas-sketch ambient.js --open
import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random.js';

const LED_W = 49;
const LED_H = 39;

const SCENE_DURATION_MS = 80000;  // 80s per scene
const TRANSITION_MS = 6000;        // 6s crossfade

const SCENES = ['aurora', 'embers', 'ocean', 'midnight'];

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

// Aurora borealis: magenta-pink to rose bands flowing horizontally
function fillAurora(buf, t) {
  for (let py = 0; py < LED_H; py++) {
    for (let px = 0; px < LED_W; px++) {
      const nx = px / LED_W;
      const ny = py / LED_H;

      const n1 = random.noise3D(nx * 2,      ny * 3,      t * 0.15);
      const n2 = random.noise3D(nx * 4 + 10, ny * 2 + 5,  t * 0.10);
      const n3 = random.noise3D(nx * 1 + 20, ny * 5 + 15, t * 0.08);

      const combined = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
      const verticalFade = Math.pow(Math.max(0, 1 - ny * 0.8), 1.5);
      const brightness = (combined * 0.5 + 0.5) * verticalFade;

      const hue = 315 + (n2 * 0.5 + 0.5) * 40; // magenta-pink (315) → rose (355)
      const [r, g, b] = hslToRgb(hue, 0.9, brightness * 0.5);

      const i = (py * LED_W + px) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
}

// Embers: pink heat rising from the bottom (black → deep rose → hot pink → pale pink)
function fillEmbers(buf, t) {
  for (let py = 0; py < LED_H; py++) {
    for (let px = 0; px < LED_W; px++) {
      const nx = px / LED_W;
      const ny = py / LED_H; // 0 = top, 1 = bottom

      const speed = 0.4;
      const n1 = random.noise3D(nx * 3,     ny * 2 - t * speed,        t * 0.05);
      const n2 = random.noise3D(nx * 5 + 7, ny * 3 - t * speed * 1.3,  t * 0.08);

      const noise = ((n1 + n2 * 0.6) / 1.6) * 0.5 + 0.5;
      const heat = noise * Math.pow(1 - ny, 0.55);

      let r, g, b;
      if (heat < 0.2) {
        const p = heat / 0.2;
        r = p * 80; g = 0; b = p * 30;
      } else if (heat < 0.5) {
        const p = (heat - 0.2) / 0.3;
        r = 80 + p * 175; g = p * 20; b = 30 + p * 90;
      } else if (heat < 0.8) {
        const p = (heat - 0.5) / 0.3;
        r = 255; g = 20 + p * 100; b = 120 + p * 60;
      } else {
        const p = (heat - 0.8) / 0.2;
        r = 255; g = 120 + p * 110; b = 180 + p * 60;
      }

      const i = (py * LED_W + px) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
}

// Ocean: deep plum shifting into pink, with pale pink foam crests
function fillOcean(buf, t) {
  for (let py = 0; py < LED_H; py++) {
    for (let px = 0; px < LED_W; px++) {
      const nx = px / LED_W;
      const ny = py / LED_H;

      const w1 = random.noise3D(nx * 4,     ny * 2,     t * 0.12);
      const w2 = random.noise3D(nx * 7 + 5, ny * 3 + 3, t * 0.18);
      const depth = (w1 * 0.6 + w2 * 0.4) * 0.5 + 0.5;

      let r, g, b;
      if (depth < 0.4) {
        const p = depth / 0.4;
        r = 40 + p * 120; g = p * 20; b = 25 + p * 65;
      } else if (depth < 0.75) {
        const p = (depth - 0.4) / 0.35;
        r = 160 + p * 80; g = 20 + p * 70; b = 90 + p * 70;
      } else {
        const p = (depth - 0.75) / 0.25;
        r = 240 + p * 15; g = 90 + p * 130; b = 160 + p * 75;
      }

      const i = (py * LED_W + px) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
}

// Midnight nebula: slow drifting magenta-to-rose clouds
function fillMidnight(buf, t) {
  for (let py = 0; py < LED_H; py++) {
    for (let px = 0; px < LED_W; px++) {
      const nx = px / LED_W;
      const ny = py / LED_H;

      const n1 = random.noise3D(nx * 2,     ny * 2,     t * 0.06);
      const n2 = random.noise3D(nx * 5 + 8, ny * 4 + 3, t * 0.09);

      const v = (n1 * 0.6 + n2 * 0.4) * 0.5 + 0.5;
      const hue = 310 + v * 40; // magenta (310) → rose (350)
      const [r, g, b] = hslToRgb(hue, 0.8, v * 0.38);

      const i = (py * LED_W + px) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
}

function fillScene(name, buf, t) {
  switch (name) {
    case 'aurora':   fillAurora(buf, t);   break;
    case 'embers':   fillEmbers(buf, t);   break;
    case 'ocean':    fillOcean(buf, t);    break;
    case 'midnight': fillMidnight(buf, t); break;
  }
}

function blendInto(a, b, progress, out) {
  const inv = 1 - progress;
  for (let i = 0; i < out.length; i += 4) {
    out[i]     = a[i]     * inv + b[i]     * progress;
    out[i + 1] = a[i + 1] * inv + b[i + 1] * progress;
    out[i + 2] = a[i + 2] * inv + b[i + 2] * progress;
    out[i + 3] = 255;
  }
}

// Scale LED_W × LED_H buffer up to canvas size (nearest-neighbour)
// Writes into a pre-allocated ImageData to avoid per-frame allocation.
function scaleUpInto(src, dst, width, height) {
  const scaleX = width  / LED_W;
  const scaleY = height / LED_H;
  const dstData = dst.data;
  for (let py = 0; py < height; py++) {
    const sy = Math.min(LED_H - 1, Math.floor(py / scaleY));
    for (let px = 0; px < width; px++) {
      const sx = Math.min(LED_W - 1, Math.floor(px / scaleX));
      const si = (sy * LED_W + sx) * 4;
      const di = (py * width  + px) * 4;
      dstData[di]     = src[si];
      dstData[di + 1] = src[si + 1];
      dstData[di + 2] = src[si + 2];
      dstData[di + 3] = 255;
    }
  }
}

const sketch = ({ width, height }) => {
  const startTime = Date.now();
  const pixelCount = LED_W * LED_H * 4;

  // Pre-allocate all buffers once — no GC pressure per frame
  const bufA     = new Uint8ClampedArray(pixelCount);
  const bufB     = new Uint8ClampedArray(pixelCount);
  const bufBlend = new Uint8ClampedArray(pixelCount);
  let fullImageData = null; // created on first render (needs context)

  return ({ context, width, height }) => {
    if (!fullImageData) {
      fullImageData = context.createImageData(width, height);
    }

    const elapsedMs = Date.now() - startTime;
    const t = elapsedMs / 1000;

    const cycleMs    = SCENE_DURATION_MS + TRANSITION_MS;
    const cyclePos   = elapsedMs % cycleMs;
    const sceneIndex = Math.floor(elapsedMs / cycleMs) % SCENES.length;

    if (cyclePos < SCENE_DURATION_MS) {
      fillScene(SCENES[sceneIndex], bufA, t);
      scaleUpInto(bufA, fullImageData, width, height);
    } else {
      const transProgress = (cyclePos - SCENE_DURATION_MS) / TRANSITION_MS;
      const nextIndex = (sceneIndex + 1) % SCENES.length;
      fillScene(SCENES[sceneIndex], bufA, t);
      fillScene(SCENES[nextIndex],  bufB, t);
      blendInto(bufA, bufB, transProgress, bufBlend);
      scaleUpInto(bufBlend, fullImageData, width, height);
    }

    context.putImageData(fullImageData, 0, 0);
  };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
  canvasSketch(sketch, {
    dimensions: [490, 390],
    animate: true,
    fps: 30
  });
}

export default sketch;
