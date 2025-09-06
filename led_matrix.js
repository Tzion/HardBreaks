// @ts-nocheck
// PARAMETERS - Change these values as needed
const CM_RATIO = 1500 / 70; // multiple any numeric value to convert to real centimeters on the TV screen (e.g. 7 * CM_RATIO = 7 cm on the tv screen)
const CANVAS_WIDTH = 1500; // 1500 equals 70 cm on the tv screen
const CANVAS_HEIGHT = 1500;

let canvas;
let ctx;

// LED Strip object
class LEDStrip {
  constructor(length = 70, numberOfChips = 100, width = .12) {
    this.length = length * CM_RATIO;
    this.numberOfChips = numberOfChips;
    this.width = width * CM_RATIO;
    this.stripColor = '#fff';
    this.chipSize = .5 * CM_RATIO; // 0.5cm chip size

    // Create array of chips
    this.chips = [];
    const chipsPerRow = Math.floor(this.length / this.chipSize);
    const totalChips = Math.min(chipsPerRow, this.numberOfChips);

    for (let i = 0; i < totalChips; i++) {
      this.chips.push(new LEDStrip.Chip(i * this.chipSize, 0, this.chipSize, '#333'));
    }
  }

  draw(x, y) {
    // Draw strip border
    ctx.strokeStyle = this.stripColor;
    ctx.lineWidth = 0.4;
    ctx.strokeRect(x, y, this.length, this.width);

    // Create and draw chips
    for (let i = 0; i < this.numberOfChips; i++) {
      new LEDStrip.Chip(x + (i * this.chipSize), y + (this.width - this.chipSize) / 2, this.chipSize, '#733');
    }
  }

  // Nested Chip class
  static Chip = class {
    constructor(x, y, size, color) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.color = color;
      this.draw();
    }

    draw() {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size / 2, this.size / 2);
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
