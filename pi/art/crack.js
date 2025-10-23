// TO RUN: canvas-sketch crack_demo.js --open
const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random')

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const settings = {
  dimensions: [1080, 1080],
  animate: false,
  fps: 3
};

const sketch = ({ context, width, height }) => {
    /** @type {CanvasRenderingContext2D} */
    const ctxs = context;
    ctxs.beginPath
  const crack = new Crack(new Point(50 + random.range(width - 50), 0), new Point(50 + random.range(width - 50), height));
  console.log(crack);
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    crack.draw(context);
  };
};

class CrackPath {
  constructor(start, end, interpolation) {
    this.start = start;
    this.end = end;
    this.interpolation = interpolation;
  }

  draw(context) {
    this.singleLine(context);
    // this.singleLine(context);
  }

  singleLine(context) {
    context.beginPath();
    context.moveTo(this.start.x, this.start.y);
    const steps = random.rangeFloor(5, 20); // Number of segments to create a noisy line

    // Draw first noisy line to end point
    for (let i = 1; i < steps; i++) {
      const frequency = random.range(20, 110);
      const amplitude = random.range(20, 100);
      const t = i / steps;
      const x = this.start.x + (this.end.x - this.start.x) * t;
      const y = this.start.y + (this.end.y - this.start.y) * t;

      const noiseX = random.noise2D(x, y, frequency, amplitude);
      const noiseY = random.noise2D(y, x, frequency, amplitude);

      context.lineTo(x + noiseX, y + noiseY);
    }
    context.lineTo(this.end.x, this.end.y);

    // Second line (bottom path) - going back to start
    // DON'T call beginPath() here - we want to continue the same path
    for (let i = steps - 1; i >= 0; i--) {
      const frequency = random.range(20, 520);
      const amplitude = random.range(20, 50);
      const t = i / steps;
      const x = this.start.x + (this.end.x - this.start.x) * t;
      const y = this.start.y + (this.end.y - this.start.y) * t;

      // Create different noise for the second line
      const noiseX = random.noise2D(x + 100, y + 100, frequency, amplitude);
      const noiseY = random.noise2D(y + 100, x + 100, frequency, amplitude);

      context.lineTo(x + noiseX, y + noiseY);
    }
    context.stroke();
    context.closePath();
    context.fillStyle = 'red'
    context.fill()

  }
}


class Crack {
  constructor(startP, endP) {
    this.startP = startP;
    this.endP = endP;
    this.direction = random.range(-Math.PI, Math.PI);
    this.length = random.range(100, 200);
  }

  draw(context) {
    context.beginPath();
    context.arc(this.x, this.y, 5, 0, Math.PI * 2);
    context.fillStyle = 'blue';
    context.fill();

    // Draw the crack line
    const path = new CrackPath(this.startP, this.endP)
    path.draw(context)

  }
}


canvasSketch(sketch, settings);
