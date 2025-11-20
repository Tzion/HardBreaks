import random from 'canvas-sketch-util/random.js';

// Helper to pick endpoints from boundary indices and convert to absolute coords
export function pickCrackEndpoints(boundaryCache, centerX, centerY, idxA, idxB) {
  const pA = boundaryCache[idxA];
  const pB = boundaryCache[idxB];
  return {
    start: { x: centerX + pA.x, y: centerY + pA.y },
    end: { x: centerX + pB.x, y: centerY + pB.y }
  };
}

export class Crack {
  constructor(start, end, baseSize, CONFIG) {
    this.start = start;
    this.end = end;
    this.baseSize = baseSize;
    this.CONFIG = CONFIG;
    this.points = this.generatePoints();
  }

  generatePoints() {
    const steps = random.rangeFloor(this.CONFIG.CRACK_STEPS_MIN, this.CONFIG.CRACK_STEPS_MAX);
    const pts = [this.start];
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = this.start.x + (this.end.x - this.start.x) * t;
      const y = this.start.y + (this.end.y - this.start.y) * t;
      // Controlled noise scaled by baseSize
      const amp = random.range(this.CONFIG.CRACK_NOISE_AMP_MIN, this.CONFIG.CRACK_NOISE_AMP_MAX) * (this.baseSize / 320);
      const freq = random.range(this.CONFIG.CRACK_NOISE_FREQ_MIN, this.CONFIG.CRACK_NOISE_FREQ_MAX);
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
