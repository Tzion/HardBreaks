const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random')

const settings = {
  dimensions: [1080, 1080],
  animate: true,
  fps: 1
};

const sketch = ( {context, width, height} ) => {
  const crack = new Crack(50 + random.range(width - 50), 0);
  console.log(crack);
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);
    crack.draw(context);
  };
};


class Crack {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.direction = random.range(-Math.PI, Math.PI);
    this.length = random.range(100, 200);
  }

  draw(context) {
    context.beginPath();
    context.arc(this.x, this.y, 5, 0, Math.PI * 2);
    context.fillStyle = 'blue';
    context.fill();

    // Draw the crack line
    context.beginPath();
    context.moveTo(this.x, this.y);
    context.lineTo(this.x + this.length * Math.cos(this.direction), this.y + this.length * Math.sin(this.direction));
    context.strokeStyle = 'red';
    context.stroke();
    
  }
}

canvasSketch(sketch, settings);
