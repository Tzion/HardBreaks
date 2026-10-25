# CLAUDE.md

HardBreaks is an LED matrix art installation: a 49×39 WS2815 matrix showing a heart that beats, cracks, and heals. There are three separate pieces: the Pi renderer (Node.js, `pi/`), the RP2040 firmware (`sink/rp2040-led/`), and a standalone landing page (`onepager/`, its own package and README). There are no tests and no linter.

## Commands

Run these from the repo root unless noted. The root package is ESM (`"type": "module"`).

- Run the render loop (what the systemd unit `services/hardbreaks.service` runs on the Pi): `node pi/run.js`
- Send one still image to the matrix: `node pi/send_image.js 49 39 path/to/image.png`
- Play a video (needs `ffmpeg`): `node pi/run_video.js [video.mp4]`
- Flash the RP2040 (PlatformIO; the board must be mounted at `/Volumes/RPI-RP2`): `npm run upload:rp2040`
- Browser simulator: `python3 -m http.server 8000`, then open `http://localhost:8000/sink/simulator/`. Run `node sink/simulator/serial_bridge.js` to feed it serial data over `ws://localhost:8080`.
- Develop an animation in the browser: `canvas-sketch pi/art/hardbreaks.js --open` (needs the global `canvas-sketch-cli`).
- Onepager: `cd onepager && npx serve public` (static preview only), deploy with `netlify deploy --prod`.

## Render pipeline (Pi → RP2040)

`pi/run.js` mounts a canvas-sketch animation from `pi/art/` on a node-canvas (490×390) and, at a fixed fps, runs:

1. `pixelize.scaleDown`: downscales to 49×39.
2. `frame.toRGB`: RGBA to RGB.
3. `frame.remapToPhysicalLayout`: maps the row-major image to LED wiring order. The matrix is 49 vertical strips of 39 LEDs, split into 7 groups (one data pin each, 8/7/7/6/7/7/7 strips). Within each group the strips are read in reverse column order and every other strip runs bottom-to-top. Then each group's `offset` is applied: a positive offset adds dummy pixels at the start of the group, a negative one drops pixels. These fix hardware quirks found on the real matrix (see `findings.md`).
4. `frame.createPacket`: `0xFF 0xAA`, uint16 LE length, RGB payload, then a checksum byte (sum of payload bytes & 0xFF).
5. `transmit.send`: writes over USB serial (`config.serial.path`, 115200). `run.js` reconnects when no write has succeeded for 5 s.

The firmware (`sink/rp2040-led/src/main.cpp`) parses this packet with a byte state machine, copies the payload straight into the FastLED `leds` array, and shows it, even when the checksum fails.

**The LED layout is defined twice and must stay in sync by hand:** `LED_CONFIG` in `pi/frame.js` (pins, strips per group, offsets) and the `STRIP_*` / `NUM_LEDS_GROUP_*` defines plus the `addLeds` order in `main.cpp`. The firmware's `FRAME_SIZE` includes an `OFFSET_PIXELS` slack so positive offsets fit.

`config.js` holds shared settings (matrix size, serial path, simulator). `npm run config:h` generates a header from it, but it writes `sink/rp2040-led/config.h`, while the firmware includes `src/config.h`, and `main.cpp` hardcodes its own sizes anyway. `run.js` sets its own fps and canvas size instead of using `config.fps`.

## Animations

Each file in `pi/art/` is a canvas-sketch sketch (a function returning a render function). To change which one runs on the Pi, change the call at the bottom of `pi/run.js`. `hardbreaks.js` is the main piece, a state machine (BEATING → HALTING → CRACKING → HEALING → COMPLETE) whose timings, colors, and sizes are randomized every cycle by `generateConfig()`. Crack geometry comes from `cracks.js`.

## Onepager

A static page in `onepager/public/` plus Netlify functions in `onepager/netlify/functions/`, served under `/api/*`. Visitors share a story as text or a recording. Recordings are converted to MP3 in the browser (vendored lame.js) and uploaded to a private Cloudflare R2 bucket through a presigned URL. The shared R2 client, limits, and ntfy helper are in `netlify/lib/r2.mjs`, kept outside `functions/` so it is not published as an endpoint. `MAX_MB` there must match `MAX_MB` in `public/script.js`. Env vars are listed in `onepager/.env.sample`. The root `.gitignore` ignores `*.mp4` and `*.jpg`, so `onepager/.gitignore` re-includes `public/assets/*`.
