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

  // Draw healing material growing along crack path
  drawHealing(context, healProgress) {
    if (healProgress <= 0) return;

    const crackWidth = this.baseSize * this.CONFIG.CRACK_LINE_WIDTH_FACTOR;
    const maxHealWidth = crackWidth * 1.6; // S x crack width at full expansion

    // Calculate healing width based on progress
    // 0-0.5: grow from 1px to crack width (filling phase)
    // 0.5-1: grow from crack width to max (expansion/pushing phase)
    let width;
    if (healProgress < 0.5) {
      width = 1 + (crackWidth - 1) * (healProgress / 0.5);
    } else {
      const extraProgress = (healProgress - 0.5) / 0.5;
      width = crackWidth + (maxHealWidth - crackWidth) * extraProgress;
    }

    context.save();
    context.strokeStyle = 'rgb(255, 220, 100)'; // yellow healing material
    context.lineWidth = width;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      context.lineTo(this.points[i].x, this.points[i].y);
    }
    context.stroke();
    context.restore();
  }

  // Calculate displacement for boundary points near crack endpoints
  getDisplacementAt(point, healProgress, center) {
    if (healProgress <= 0.5) return 0; // No displacement until crack is filled

    const extraProgress = (healProgress - 0.5) / 0.5; // 0 to 1 for expansion phase

    // Check distance to crack endpoints
    const distToStart = Math.hypot(point.x - this.start.x, point.y - this.start.y);
    const distToEnd = Math.hypot(point.x - this.end.x, point.y - this.end.y);
    const minDist = Math.min(distToStart, distToEnd);

    // Displacement parameters
    const crackWidth = this.baseSize * this.CONFIG.CRACK_LINE_WIDTH_FACTOR;
    const maxDisplacement = crackWidth * 1.5;
    const influenceRadius = this.baseSize * 0.4; // influence zone around endpoints

    if (minDist < influenceRadius) {
      const falloff = 1 - (minDist / influenceRadius);
      return maxDisplacement * falloff * extraProgress;
    }

    return 0;
  }
}
