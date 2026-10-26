// Transitions between two animations, used by the Player (pi/player.js).
// A transition is an object { name, seconds, blend(from, to, progress, out) }:
//   from, to, out: RGBA pixel arrays of the same size, at LED resolution (49×39×4)
//   progress:      0 at the start of the transition, 1 at the end
// blend() writes the mixed frame into out. To add an effect, add a factory that returns such an object.

// Ease in and out, so changes start and end gently
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Mix two pixels: weight 0 = from, 1 = to
function mixPixel(from, to, i, weight, out) {
    const inv = 1 - weight;
    out[i] = from[i] * inv + to[i] * weight;
    out[i + 1] = from[i + 1] * inv + to[i + 1] * weight;
    out[i + 2] = from[i + 2] * inv + to[i + 2] * weight;
    out[i + 3] = 255;
}

// The old animation fades to black, then the new one fades in
export function fadeThroughBlack({ seconds = 2 } = {}) {
    return {
        name: 'fade through black',
        seconds,
        blend(from, to, progress, out) {
            const src = progress < 0.5 ? from : to;
            const level = smooth(Math.abs(progress * 2 - 1)); // 1 → 0 → 1
            for (let i = 0; i < out.length; i += 4) {
                out[i] = src[i] * level;
                out[i + 1] = src[i + 1] * level;
                out[i + 2] = src[i + 2] * level;
                out[i + 3] = 255;
            }
        },
    };
}

// The old animation dissolves directly into the new one
export function crossfade({ seconds = 3 } = {}) {
    return {
        name: 'crossfade',
        seconds,
        blend(from, to, progress, out) {
            const weight = smooth(progress);
            for (let i = 0; i < out.length; i += 4) mixPixel(from, to, i, weight, out);
        },
    };
}

// The old animation pulls into the bright shape of the new one: where the new frame is dark
// (its background) the old one fades out first, and where it's bright (e.g. the heart) the old
// one stays longest and then turns into the new one. Best when the new animation is a shape on black.
// softness: how much of the transition each pixel takes to switch (0-1; smaller = sharper edges)
export function gather({ seconds = 4, softness = 0.35 } = {}) {
    return {
        name: 'gather',
        seconds,
        blend(from, to, progress, out) {
            for (let i = 0; i < out.length; i += 4) {
                const brightness = Math.max(to[i], to[i + 1], to[i + 2]) / 255;
                const start = brightness * (1 - softness); // dark pixels switch first, bright ones last
                const weight = smooth(clamp01((progress - start) / softness));
                mixPixel(from, to, i, weight, out);
            }
        },
    };
}
