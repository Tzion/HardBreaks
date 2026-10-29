// QR code for the LED matrix, as a sketch the Player (pi/player.js) can play like any animation.
//
//   const qrSketch = createQrSketch('https://hardbreaks.netlify.app');
//
// One LED per QR module: the background (and the quiet zone around the code) is lit, the dark modules are off,
// which gives phone cameras the most contrast. Each module is drawn as a block aligned to the LED grid of the
// canvas (e.g. 3×3 pixels on the Player's 147×117 canvas), so shrinking to 49×39 keeps it sharp.
import QRCode from 'qrcode';

// Options: color of the lit LEDs (a dimmer color means less glare on camera), invert (lit code on a black
// background instead of a dark code on a lit background; most phone cameras read both).
export function createQrSketch(text, { color = 'white', invert = false, ledSize = [49, 39] } = {}) {
    // Error correction Q survives ~25% damage (dead or flickering LEDs) and still fits: 29×29 for a short URL
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'Q' });
    const n = modules.size;
    const [cols, rows] = ledSize;
    if (n > Math.min(cols, rows)) throw new Error(`QR code is ${n}×${n} modules, too big for ${cols}×${rows} LEDs: shorten the text`);

    return ({ width, height }) => {
        const px = width / cols;  // canvas pixels per LED
        const py = height / rows;
        const x0 = Math.floor((cols - n) / 2); // centered, in LEDs
        const y0 = Math.floor((rows - n) / 2);

        const [background, code] = invert ? ['black', color] : [color, 'black'];
        return ({ context }) => {
            context.fillStyle = background;
            context.fillRect(0, 0, width, height);
            context.fillStyle = code;
            for (let y = 0; y < n; y++) {
                for (let x = 0; x < n; x++) {
                    if (modules.get(y, x)) context.fillRect((x0 + x) * px, (y0 + y) * py, px, py);
                }
            }
        };
    };
}
