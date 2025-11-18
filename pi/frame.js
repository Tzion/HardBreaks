// Convert RGBA ImageData to RGB buffer (strip alpha)
export function toRGB(imageData) {
    const { width, height, data } = imageData;
    const rgb = Buffer.allocUnsafe(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        rgb[j] = data[i];       // R
        rgb[j + 1] = data[i + 1]; // G
        rgb[j + 2] = data[i + 2]; // B
    }
    return rgb;
}

export function pixelAt(RGBArray, i) {
    const base = i * 3;
    return [RGBArray[base], RGBArray[base + 1], RGBArray[base + 2]];
}

/* Protocol:
MAGIC: 2 bytes (e.g., 0xFF 0xAA) - frame start marker
LENGTH: 2 bytes - payload size (5,733 for full frame, 3 for single pixel)
DATA: N bytes - RGB pixel data
CHECKSUM: 1 byte - simple sum or CRC8
*/

// Add packet framing for serial transmission
export function createPacket(rgbData) {
    const MAGIC = Buffer.from([0xFF, 0xAA]);
    const length = Buffer.allocUnsafe(2);
    length.writeUInt16LE(rgbData.length);
    
    // Simple checksum: sum of all bytes % 256
    let checksum = 0;
    for (let i = 0; i < rgbData.length; i++) {
        checksum = (checksum + rgbData[i]) & 0xFF;
    }
    console.log(`createPacket: payload=${rgbData.length} bytes, checksum=0x${checksum.toString(16).padStart(2,'0')} (${checksum})`);
    return Buffer.concat([
        MAGIC,
        length,
        rgbData,
        Buffer.from([checksum])
    ]);
}


/**
 * Remaps a flat RGB array from standard image layout (horizontal raster scan)
 * to the physical LED matrix layout (7 groups of 7 vertical serpentine strips).
 * 
 * Physical layout:
 * - 7 groups of LEDs (each on different controller pin)
 * - Each group: 7 vertical strips of 39 LEDs
 * - Total: 49 columns × 39 rows = 1,911 LEDs
 * - Sequential serpentine wiring: odd strips go top→bottom, even strips go bottom→top
 * 
 * @param {Uint8Array} imageRGB - Flat RGB array [R,G,B,R,G,B,...] in row-major order
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Uint8Array} - Remapped RGB array for physical LED layout
 */
export function remapToPhysicalLayout(imageRGB, width=49, height=39, groups=7, stripsPerGroup=7, ledsPerStrip=height, pixelSize=3) {
    
    if (width !== groups * stripsPerGroup) {
        throw new Error(`Width must be ${groups * stripsPerGroup}, got ${width}`);
    }
    if (height !== ledsPerStrip) {
        throw new Error(`Height must be ${ledsPerStrip}, got ${height}`);
    }
    
    const totalLEDs = width * height;
    const outputRGB = new Uint8Array(totalLEDs * pixelSize);
    
    // Process each group
    for (let group = 0; group < groups; group++) {
        const groupStartCol = group * stripsPerGroup;
        
        // Process each strip within the group
        for (let strip = 0; strip < stripsPerGroup; strip++) {
            const col = groupStartCol + strip;
            const isReversed = strip % 2 === 1; // Odd strips go bottom→top
            
            // Calculate the starting LED index for this strip in the output
            const stripStartLED = (group * stripsPerGroup * ledsPerStrip) + (strip * ledsPerStrip);
            
            // Map each LED in this strip
            for (let row = 0; row < height; row++) {
                // Source pixel position in the image
                const imagePixelIndex = row * width + col;
                const imageSrcOffset = imagePixelIndex * pixelSize;
                
                // Destination LED position in the strip
                const ledInStrip = isReversed ? (height - 1 - row) : row;
                const outputLED = stripStartLED + ledInStrip;
                const outputOffset = outputLED * pixelSize;
                
                // Copy RGB values
                outputRGB[outputOffset] = imageRGB[imageSrcOffset];         // R
                outputRGB[outputOffset + 1] = imageRGB[imageSrcOffset + 1]; // G
                outputRGB[outputOffset + 2] = imageRGB[imageSrcOffset + 2]; // B
            }
        }
    }
    
    return outputRGB;
}