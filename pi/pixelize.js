// Downscale ImageData to a smaller canvas and return that canvas (Approach A).
import { createCanvas } from 'canvas';

export function scaleDown(imageData, targetWidth = 49, targetHeight = 39) {
    if (!imageData || !imageData.data || typeof imageData.width !== 'number' || typeof imageData.height !== 'number') {
        throw new Error('pixelize.scaleDownToCanvas: expected ImageData input');
    }

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
