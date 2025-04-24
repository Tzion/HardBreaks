const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random')
const { Point } = require('./geometry');

const settings = {
  dimensions: [1080, 1080],
  animate: false,
  fps: 3
};

const sketch = ({ context, width, height }) => {
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
    this.singleLine(context);
  }

  singleLine(context) {
    context.beginPath();
    context.moveTo(this.start.x, this.start.y);
    const steps = random.rangeFloor(5, 20); // Number of segments to create a noisy line

    for (let i = 1; i < steps; i++) {
      // Interpolate position between start and end
      const frequency = random.range(20, 50); // Scale factor for noise
      const amplitude = random.range(20, 50); // How much the line can deviate
      const t = i / steps;
      const x = this.start.x + (this.end.x - this.start.x) * t;
      const y = this.start.y + (this.end.y - this.start.y) * t;

      // Add noise offset
      const noiseX = random.noise2D(x, y, frequency, amplitude);
      const noiseY = random.noise2D(y, x, frequency, amplitude);

      // Draw line to this noisy point
      context.lineTo(x + noiseX, y + noiseY);
      context.stroke();
    }
    context.lineTo(this.end.x, this.end.y);
    context.stroke();

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
