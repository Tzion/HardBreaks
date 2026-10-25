// Generate a QR code with custom colors and rounded corners.
// Usage: node utils/qr.js <url> [-o qr.svg|qr.png] [--fg #000] [--bg #fff|transparent] [--radius 0.5] [--size 1024]
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o', default: 'qr.svg' },
    fg: { type: 'string', default: '#000000' },
    bg: { type: 'string', default: '#ffffff' },
    radius: { type: 'string', default: '0.5' }, // corner radius in modules, 0 (square) to 0.5 (fully round)
    size: { type: 'string', default: '1024' }, // output width/height in px
  },
});

const text = positionals[0];
if (!text) {
  console.error('Usage: node utils/qr.js <url> [-o qr.svg|qr.png] [--fg #000] [--bg #fff|transparent] [--radius 0.5] [--size 1024]');
  process.exit(1);
}

const r = Math.min(Math.max(Number(values.radius), 0), 0.5);
const size = Number(values.size);
const MARGIN = 4; // quiet zone in modules, required by the QR spec

const { modules } = QRCode.create(text, { errorCorrectionLevel: 'H' });
const n = modules.size;
const dark = (x, y) => x >= 0 && y >= 0 && x < n && y < n && modules.get(y, x);

// Each dark module is a square whose corner is rounded only when both
// neighbors touching that corner are light, so connected modules merge into smooth shapes.
let d = '';
for (let y = 0; y < n; y++) {
  for (let x = 0; x < n; x++) {
    if (!dark(x, y)) continue;
    const up = dark(x, y - 1), down = dark(x, y + 1), left = dark(x - 1, y), right = dark(x + 1, y);
    const tl = !up && !left ? r : 0;
    const tr = !up && !right ? r : 0;
    const br = !down && !right ? r : 0;
    const bl = !down && !left ? r : 0;
    const X = x + MARGIN, Y = y + MARGIN;
    d += `M${X + tl},${Y}H${X + 1 - tr}A${tr},${tr} 0 0 1 ${X + 1},${Y + tr}`
      + `V${Y + 1 - br}A${br},${br} 0 0 1 ${X + 1 - br},${Y + 1}`
      + `H${X + bl}A${bl},${bl} 0 0 1 ${X},${Y + 1 - bl}`
      + `V${Y + tl}A${tl},${tl} 0 0 1 ${X + tl},${Y}Z`;
  }
}

const total = n + MARGIN * 2;
const bgRect = values.bg === 'transparent' ? '' : `<rect width="${total}" height="${total}" fill="${values.bg}"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}">`
  + `${bgRect}<path d="${d}" fill="${values.fg}"/></svg>`;

if (values.out.endsWith('.png')) {
  const img = await loadImage(Buffer.from(svg));
  const canvas = createCanvas(size, size);
  canvas.getContext('2d').drawImage(img, 0, 0, size, size);
  fs.writeFileSync(values.out, canvas.toBuffer('image/png'));
} else {
  fs.writeFileSync(values.out, svg);
}
console.log(`saved ${values.out}`);
