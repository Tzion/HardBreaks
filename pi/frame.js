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
    console.log(`createPacket: payload=${rgbData.length} bytes, checksum=0x${checksum.toString(16).padStart(2, '0')} (${checksum})`);
    return Buffer.concat([
        MAGIC,
        length,
        rgbData,
        Buffer.from([checksum])
    ]);
}


/**
 * Physical LED strip configuration
 * Defines the actual wiring for each group including offsets and strip counts
 */
export const LED_CONFIG = {
    ledsPerStrip: 39,
    groups: [
        {
            id: 0,
            pin: 28,
            strips: 6,  // Only 6 strips for now
            offset: 0
        },
        // {
        //     id: 1,
        //     pin: 7,
        //     strips: 7,
        //     offset: 1  // Add 1 dummy pixel at start
        // },
        // {
        //     id: 2,
        //     pin: 9,
        //     strips: 7,
        //     offset: -1
        // },
        // {
        //     id: 3,
        //     pin: 8,
        //     strips: 7,
        //     offset: 0
        // }
    ]
};

/**
 * Get total LEDs across all configured groups (without offsets)
 */
export function getTotalLEDs() {
    return LED_CONFIG.groups.reduce((total, group) => {
        return total + (group.strips * LED_CONFIG.ledsPerStrip);
    }, 0);
}

/**
 * Get total strips across all groups
 */
export function getTotalStrips() {
    return LED_CONFIG.groups.reduce((sum, g) => sum + g.strips, 0);
}

/**
 * Step 1: Pure logical remapping with group-aware serpentine
 * The reversal pattern resets for each group
 */
export function remapImageToStrips(rgb, width, height) {
    const totalLEDs = getTotalLEDs();
    const outputRGB = new Uint8Array(totalLEDs * 3);

    let globalStripIndex = 0;
    let outputLEDIndex = 0;

    // Process each group separately
    for (const group of LED_CONFIG.groups) {
        // Process strips within this group
        for (let stripInGroup = 0; stripInGroup < group.strips; stripInGroup++) {
            const isReversed = stripInGroup % 2 === 1; // Odd strips WITHIN GROUP reversed

            for (let row = 0; row < height; row++) {
                // Source: horizontal raster scan using global strip index
                const srcPixel = row * width + globalStripIndex;
                const srcOffset = srcPixel * 3;

                // Destination: vertical serpentine
                const dstRow = isReversed ? (height - 1 - row) : row;
                const dstOffset = (outputLEDIndex + dstRow) * 3;

                // Copy RGB
                outputRGB[dstOffset] = rgb[srcOffset];
                outputRGB[dstOffset + 1] = rgb[srcOffset + 1];
                outputRGB[dstOffset + 2] = rgb[srcOffset + 2];
            }

            globalStripIndex++;
            outputLEDIndex += height;
        }
    }

    return outputRGB;
}

/**
 * Step 2: Apply physical configuration fixes
 * Handles hardware-specific quirks: offsets, missing strips, wiring issues
 * 
 * @param {Uint8Array} remapped - RGB array after logical remapping
 * @param {number} height - LEDs per strip
 * @returns {Uint8Array} - Final RGB array with physical fixes applied
 */
export function applyPhysicalFixes(remapped, height) {
    // Calculate output size
    let outputSize = 0;
    for (const group of LED_CONFIG.groups) {
        const groupLEDs = group.strips * height;
        const positiveOffset = group.offset > 0 ? group.offset : 0;
        outputSize += (groupLEDs + positiveOffset) * 3;
    }

    const output = new Uint8Array(outputSize);
    let readPos = 0;
    let writePos = 0;

    for (const group of LED_CONFIG.groups) {
        const groupLEDs = group.strips * height;
        const groupBytes = groupLEDs * 3;
        const offset = group.offset || 0;

        console.log(`Group ${group.id}: ${group.strips} strips, offset=${offset}`);

        if (offset > 0) {
            // Add dummy pixels (zeros) at start
            console.log(`  Adding ${offset} dummy pixels`);
            writePos += offset * 3;
        } else if (offset < 0) {
            // Skip pixels from source
            console.log(`  Skipping ${Math.abs(offset)} pixels`);
            readPos += Math.abs(offset) * 3;
        }

        // Copy group data
        const bytesToCopy = Math.min(groupBytes, remapped.length - readPos);
        output.set(remapped.subarray(readPos, readPos + bytesToCopy), writePos);

        readPos += groupBytes;
        writePos += bytesToCopy;
    }

    return output;
}

/**
 * Complete remapping pipeline: image → strips → physical fixes
 * Combines logical remapping with hardware-specific corrections
 * 
 * @param {Uint8Array} imageRGB - Flat RGB array [R,G,B,R,G,B,...] in row-major order
 * @param {number} width - Image width (total strips)
 * @param {number} height - Image height (LEDs per strip)
 * @returns {Uint8Array} - Final RGB array ready for LED controller
 */
export function remapToPhysicalLayout(imageRGB, width, height) {
    // Step 1: Logical remapping (grid → serpentine strips)
    const remapped = remapImageToStrips(imageRGB, width, height);

    // Step 2: Apply physical configuration fixes
    const withFixes = applyPhysicalFixes(remapped, height);

    return withFixes;
}

/**
 * Legacy function signature support (kept for backward compatibility)
 * @deprecated Use remapToPhysicalLayout(imageRGB, width, height) instead
 */
export function remapToPhysicalLayoutLegacy(imageRGB, width, height, groups = 7, stripsPerGroup = 7) {
    console.warn('Warning: Using legacy remapToPhysicalLayout signature. Consider updating to use LED_CONFIG.');

    const ledsPerStrip = height;
    const pixelSize = 3; // RGB

    if (width !== groups * stripsPerGroup) {
        throw new Error(`Width must be ${groups * stripsPerGroup}, got ${width}`);
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