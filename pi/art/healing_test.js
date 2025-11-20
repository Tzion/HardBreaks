// Healing test - experimenting with crack filling and shape expansion
// TO RUN: canvas-sketch healing_test.js --open
import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random.js';

const CONFIG = {
  CIRCLE_RADIUS: 100,
  CRACK_WIDTH: 8,
  CRACK_COLOR: 'rgba(0, 0, 0, 0.9)',
  CIRCLE_COLOR: 'rgb(255, 100, 120)'
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
}

const sketch = ({ width, height }) => {
  const center = { x: width / 2, y: height / 2 };
  const radius = CONFIG.CIRCLE_RADIUS;
  
  // Create 2-3 cracks
  const cracks = [
    new Crack(center, radius, Math.PI * 0.2, Math.PI * 0.8),
    new Crack(center, radius, Math.PI * 1.1, Math.PI * 1.6),
    new Crack(center, radius, Math.PI * 0.4, Math.PI * 1.9)
  ];

  return ({ context, width, height }) => {
    // Background
    context.fillStyle = '#1a1a1a';
    context.fillRect(0, 0, width, height);

    // Draw circle
    context.save();
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.fillStyle = CONFIG.CIRCLE_COLOR;
    context.fill();
    
    // Clip cracks to circle interior
    context.clip();
    
    // Draw cracks
    cracks.forEach(crack => crack.draw(context));
    context.restore();
  };
};

const isBrowser = typeof window !== 'undefined';
if (isBrowser) {
  canvasSketch(sketch, {
    dimensions: [600, 600],
    animate: false
  });
}

export default sketch;
