// Healing test - experimenting with crack filling and shape expansion
// TO RUN: canvas-sketch healing_test.js --open
import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random.js';

const CONFIG = {
  CIRCLE_RADIUS: 100,
  CRACK_WIDTH: 8,
  CRACK_COLOR: 'rgba(0, 0, 0, 0.9)',
  CIRCLE_COLOR: 'rgb(255, 100, 120)',
  HEAL_COLOR: 'rgb(255, 220, 100)', // yellow healing material
  HEAL_DURATION_MS: 4000,
  MAX_HEAL_WIDTH: 20 // how much wider than crack it can grow
};

// Simple crack: two points on circle edge with noisy path between
class Crack {
  constructor(center, radius, startAngle, endAngle) {
    this.start = {
      x: center.x + Math.cos(startAngle) * radius,
      y: center.y + Math.sin(startAngle) * radius
    };
    this.end = {
      x: center.x + Math.cos(endAngle) * radius,
      y: center.y + Math.sin(endAngle) * radius
    };
    this.points = this.generatePath();
  }

  generatePath() {
    const steps = random.rangeFloor(15, 25);
    const points = [this.start];
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = this.start.x + (this.end.x - this.start.x) * t;
      const y = this.start.y + (this.end.y - this.start.y) * t;
      
      const noise = random.noise2D(x, y, 0.02, 15);
      points.push({ x: x + noise, y: y + noise });
    }
    
    points.push(this.end);
    return points;
  }

  draw(context) {
    context.save();
    context.strokeStyle = CONFIG.CRACK_COLOR;
    context.lineWidth = CONFIG.CRACK_WIDTH;
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

  // Draw healing material on top of crack
  drawHealing(context, progress) {
    // progress: 0 = no healing, 1 = fully healed and expanded
    if (progress <= 0) return;

    context.save();
    context.strokeStyle = CONFIG.HEAL_COLOR;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    // Calculate healing width based on progress
    // 0-0.5: grow from 1px to crack width
    // 0.5-1: grow from crack width to max heal width
    let width;
    if (progress < 0.5) {
      width = 1 + (CONFIG.CRACK_WIDTH - 1) * (progress / 0.5);
    } else {
      const extraProgress = (progress - 0.5) / 0.5;
      width = CONFIG.CRACK_WIDTH + (CONFIG.MAX_HEAL_WIDTH - CONFIG.CRACK_WIDTH) * extraProgress;
    }
    
    context.lineWidth = width;
    
    context.beginPath();
    context.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      context.lineTo(this.points[i].x, this.points[i].y);
    }
    context.stroke();
    context.restore();
  }

  // Calculate displacement for circle boundary points near crack endpoints
  getDisplacementAt(angle, progress, center, radius) {
    if (progress <= 0.5) return 0; // No displacement until crack is filled
    
    const extraProgress = (progress - 0.5) / 0.5; // 0 to 1 for expansion phase
    const point = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
    
    // Check distance to crack endpoints
    const distToStart = Math.hypot(point.x - this.start.x, point.y - this.start.y);
    const distToEnd = Math.hypot(point.x - this.end.x, point.y - this.end.y);
    const minDist = Math.min(distToStart, distToEnd);
    
    // Displacement falls off with distance
    const maxDisplacement = CONFIG.MAX_HEAL_WIDTH / 2;
    const influenceRadius = radius * 0.3; // 30% of circle radius
    
    if (minDist < influenceRadius) {
      const falloff = 1 - (minDist / influenceRadius);
      return maxDisplacement * falloff * extraProgress;
    }
    
    return 0;
  }
}

const sketch = ({ width, height }) => {
  const center = { x: width / 2, y: height / 2 };
  const radius = CONFIG.CIRCLE_RADIUS;
  const startTime = Date.now();
  
  // Create 2-3 cracks
  const cracks = [
    new Crack(center, radius, Math.PI * 0.2, Math.PI * 0.8),
    new Crack(center, radius, Math.PI * 1.1, Math.PI * 1.6),
    new Crack(center, radius, Math.PI * 0.4, Math.PI * 1.9)
  ];

  return ({ context, width, height }) => {
    const elapsed = Date.now() - startTime;
    const healProgress = Math.min(1, elapsed / CONFIG.HEAL_DURATION_MS);

    // Background
    context.fillStyle = '#1a1a1a';
    context.fillRect(0, 0, width, height);

    // Draw circle with displacement
    context.save();
    context.fillStyle = CONFIG.CIRCLE_COLOR;
    context.beginPath();
    
    const segments = 180;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      
      // Calculate total displacement from all cracks
      let displacement = 0;
      cracks.forEach(crack => {
        displacement += crack.getDisplacementAt(angle, healProgress, center, radius);
      });
      
      const r = radius + displacement;
      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle) * r;
      
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    
    context.closePath();
    context.fill();
    
    // Clip cracks and healing to circle interior (with displacement)
    context.clip();
    
    // Draw cracks
    cracks.forEach(crack => crack.draw(context));
    
    // Draw healing material
    cracks.forEach(crack => crack.drawHealing(context, healProgress));
    
    context.restore();
  };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
  canvasSketch(sketch, {
    dimensions: [600, 600],
    animate: true,
    fps: 30
  });
}

export default sketch;
