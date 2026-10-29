// Downscale ImageData to a smaller canvas and return that canvas (Approach A).
import { createCanvas, ImageData } from 'canvas';

export function scaleDown(imageData, targetWidth = 49, targetHeight = 39) {
    if (!imageData || !imageData.data || typeof imageData.width !== 'number' || typeof imageData.height !== 'number') {
        throw new Error('pixelize.scaleDownToCanvas: expected ImageData input');
    }

    // Whole-number factor (e.g. 147×117 → 49×39): each LED is the exact average of its block of pixels.
    // Anything drawn aligned to the LED grid (like the QR code) stays sharp, and it's cheaper than a canvas.
    const fx = imageData.width / targetWidth;
    const fy = imageData.height / targetHeight;
    if (Number.isInteger(fx) && Number.isInteger(fy)) return averageBlocks(imageData, targetWidth, targetHeight, fx, fy);

    // Build a source canvas from the ImageData
    const srcCanvas = createCanvas(imageData.width, imageData.height);
    const sctx = srcCanvas.getContext('2d');
    sctx.putImageData(imageData, 0, 0);

    // Create the smaller destination canvas
    const dstCanvas = createCanvas(targetWidth, targetHeight);
    const dctx = dstCanvas.getContext('2d');
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = 'high';

    // Draw (and thus downscale) into the destination canvas
    dctx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
    const downScaledImage = dctx.getImageData(0, 0, targetWidth, targetHeight);
    return downScaledImage;
}

function averageBlocks({ data, width }, targetWidth, targetHeight, fx, fy) {
    const out = new Uint8ClampedArray(targetWidth * targetHeight * 4);
    const count = fx * fy;
    for (let ty = 0; ty < targetHeight; ty++) {
        for (let tx = 0; tx < targetWidth; tx++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let y = ty * fy; y < (ty + 1) * fy; y++) {
                for (let x = tx * fx; x < (tx + 1) * fx; x++) {
                    const i = (y * width + x) * 4;
                    r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
                }
            }
            const o = (ty * targetWidth + tx) * 4;
            out[o] = r / count; out[o + 1] = g / count; out[o + 2] = b / count; out[o + 3] = a / count;
        }
    }
    return new ImageData(out, targetWidth, targetHeight);
}
