// Convert RGBA ImageData to RGB buffer (strip alpha)
export function toRGB(imageData) {
    const { width, height, data } = imageData;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        rgb[j] = data[i];       // R
        rgb[j + 1] = data[i + 1]; // G
        rgb[j + 2] = data[i + 2]; // B
    }
    return rgb;
}