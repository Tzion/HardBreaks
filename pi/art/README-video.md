# Video Playback for LED Matrix

Play MP4 videos on the LED matrix by extracting frames and transmitting them in real-time.

## Requirements

Make sure you have `ffmpeg` installed:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Raspberry Pi
sudo apt-get install ffmpeg
```

## Usage

### Run a video on the LED matrix:

```bash
node pi/run_video.js [path/to/video.mp4] [--cache]
```

### Examples:

```bash
# Play the default video (cooling1.mp4)
node pi/run_video.js

# Play a specific video
node pi/run_video.js pi/art/videos/cooling1.mp4

# Play any MP4 file
node pi/run_video.js /path/to/my/video.mp4

# Decode to frame files first, then play from them
node pi/run_video.js pi/art/videos/cooling1.mp4 --cache
```

## How It Works

`ffmpeg` decodes the video at the playback FPS, already scaled down to the canvas size, into raw RGBA frames. Each frame is drawn on the canvas, scaled down to the 49x39 matrix, and sent to the LED controller over serial.

There are two modes (`mode` option of `createVideoAnimation` in `pi/art/video.js`):

- **stream** (default): ffmpeg runs during playback and keeps a few frames ahead; it's paused when that queue is full, so no frames are skipped. Starts instantly, memory stays flat, any video length works. ffmpeg loops the video itself (`-stream_loop`), so there's no gap at the loop. If ffmpeg dies, the last frame stays on screen and ffmpeg restarts after 2 seconds.
- **cache** (`--cache`): ffmpeg decodes the whole video once into `/tmp/video-frames`, then playback reads the files back with no ffmpeg running. The folder is cleared on every start, so the next video replaces the previous one's frames, and it's capped at 100 MB (`CACHE_MAX_BYTES`). A longer video plays only the frames that fit, with a warning. On the Pi `/tmp` is in RAM.

When a video ends without looping, the last frame stays on screen.

## Configuration

Edit `pi/run_video.js` to adjust settings:

```javascript
const settings = {
    dimensions: [490, 390],  // Canvas size; frames are decoded at this size
    animate: true,           // Enable animation loop
    fps: 10,                 // Frames per second
    loop: true,              // Loop video continuously
    mode: 'stream'           // or 'cache' (set by --cache)
};
```

## Performance Notes

- At 490x390 a frame is about 760 KB, so the 100 MB cache holds about 130 frames (13 s at 10 fps)
- For long videos in cache mode, lower the FPS, trim the video, or use stream mode

## Adding Videos

Place MP4 files in the `pi/art/videos/` directory:

```bash
cp my-video.mp4 pi/art/videos/
```

## Tips

- Videos are automatically scaled to fit the canvas while maintaining aspect ratio
- Black bars will appear if aspect ratio doesn't match
- The LED matrix is 49x39 (approx 1.26:1 aspect ratio)
- Best results with videos close to this aspect ratio
