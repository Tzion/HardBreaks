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