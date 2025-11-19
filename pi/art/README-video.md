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
node pi/run_video.js [path/to/video.mp4]
```

### Examples:

```bash
# Play the default video (cooling1.mp4)
node pi/run_video.js

# Play a specific video
node pi/run_video.js pi/art/videos/cooling1.mp4

# Play any MP4 file
node pi/run_video.js /path/to/my/video.mp4
```

## How It Works

1. **Frame Extraction**: Uses `ffmpeg` to extract video frames at the specified FPS
2. **Frame Loading**: Loads all frames into memory as images
3. **Playback Loop**: Renders frames to canvas at specified FPS
4. **Downscaling**: Scales canvas content down to 49x39 LED matrix resolution
5. **Transmission**: Sends each frame to the LED controller via serial

## Configuration

Edit `pi/run_video.js` to adjust settings:

```javascript
const settings = {
    dimensions: [1080, 1080],  // Canvas size (higher res = better quality)
    animate: true,              // Enable animation loop
    fps: 30,                    // Frames per second
    loop: true                  // Loop video continuously
};
```

## Performance Notes

- **Frame extraction** happens once at startup and takes a few seconds
- **All frames** are loaded into memory for smooth playback
- **Large videos** with many frames may use significant RAM
- For long videos, consider:
  - Lowering FPS (e.g., 15-20 fps)
  - Trimming video length
  - Using lower resolution source videos

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
