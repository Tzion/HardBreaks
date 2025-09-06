// @ts-nocheck
// PARAMETERS - Change these values as needed
const CM_RATIO = 1500 / 70; // multiple any numeric value to convert to real centimeters on the TV screen (e.g. 7 * CM_RATIO = 7 cm on the tv screen)
const CANVAS_WIDTH = 1500; // 1500 equals 70 cm on the tv screen
const CANVAS_HEIGHT = 1500;

let canvas;
let ctx;

// LED Strip object
class LEDStrip {
  constructor(length = 70 * CM_RATIO, ledsCount = 100, width = .10 * CM_RATIO) {
    this.length = length;
    this.ledsCount = ledsCount;
    this.width = width;
  }

  draw(x, y) {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x, y, this.length, this.width);
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
