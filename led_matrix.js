// @ts-nocheck
// PARAMETERS - Change these values as needed
const CM_RATIO = 1800 / 70; // multiple centimeter values to convert to real centimeters on the TV screen (e.g. 7 * CM_RATIO = 7 cm on the tv screen)
const CANVAS_WIDTH = 80 * CM_RATIO;
const CANVAS_HEIGHT = 65 * CM_RATIO;
const STRIP_LENGTH = 80
const LEDS_PER_METER = 60
const NUMBER_OF_LEDS = STRIP_LENGTH / 100 * LEDS_PER_METER
const NUMBER_OF_STRIPS = 42

let canvas;
let ctx;

function ledMatrix() {
  const strips = NUMBER_OF_STRIPS;
  for (let i = 0; i <= strips; i++) {
    const strip = new LEDStrip(0, i * CANVAS_HEIGHT / strips + (CANVAS_HEIGHT / strips / 2), STRIP_LENGTH, NUMBER_OF_LEDS);
    strip.draw();
  }
}

// LED Strip object
class LEDStrip {
  constructor(x, y, length = 70, numberOfChips = 60, width = .12) {
    this.x = x;
    this.y = y;
    this.length = length * CM_RATIO;
    this.numberOfChips = numberOfChips;
    this.width = width * CM_RATIO;
    this.stripColor = '#fff';
    this.chipSize = .5 * CM_RATIO; // 0.5cm chip size

    // Create array of chips
    this.chips = [];

    const distanceBetweenChips = CANVAS_WIDTH / LEDS_PER_METER;
    let x_chip = 0;
    while (x_chip < this.length) {
      this.chips.push(new LEDStrip.Chip(x_chip, this.y, this.chipSize));
      x_chip += this.chipSize + distanceBetweenChips;
    }
  }

  draw() {
    // Draw strip border
    ctx.strokeStyle = this.stripColor;
    ctx.lineWidth = 0.4;
    ctx.strokeRect(this.x, this.y, this.length, this.width);
    for (let chip of this.chips) {
      const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      chip.draw(color);
    }
  }

  // Nested Chip class
  static Chip = class {
    constructor(x, y, size, color) {
      this.x = x;
      this.y = y;
      this.size = size;
    }

    draw(color) {
      ctx.fillStyle = color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
  }
}

function initCanvas() {
  canvas = document.getElementById('ledCanvas');
  ctx = canvas.getContext('2d');

  // Set canvas size
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

function showGrid() {
  // Make sure canvas is initialized
  if (!canvas) {
    initCanvas();
  }

  // Draw a simple grid to show the canvas
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw grid lines
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;

  for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= CANVAS_HEIGHT; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}
