# Known issues

Found while reading the code (Oct 2026). None of these are fixed yet.

- **LED layout is defined twice.** `LED_CONFIG` in `pi/frame.js` and the `STRIP_*` / `NUM_LEDS_GROUP_*` defines plus the `addLeds` order in `sink/rp2040-led/src/main.cpp` must be kept in sync by hand.
- **`npm run config:h` has no effect on the firmware.** It writes `sink/rp2040-led/config.h`, but the firmware includes `src/config.h`, and `main.cpp` hardcodes its own sizes anyway.
- **The firmware shows bad frames.** `main.cpp` copies the payload into `leds` and calls `FastLED.show()` even when the checksum fails.
- **`config.fps` is ignored.** `pi/run.js` uses its own fps (17) and canvas size, not `config.fps` (30).
