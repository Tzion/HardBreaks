# HardBreaks

LED matrix art installation.
A beating heart, then it breaks—slowly filling the cracks, healing, growing bigger, but scared and disfigured.

## Hardware

- **Matrix**: 49×39 WS2815 (12V) LEDs, laid out as vertical strips of 39 LEDs, split into 7 groups. Each group has its own data line.
- **Raspberry Pi**: runs the animations and the UX state machine (Node.js, started by a systemd service).
- **RP2040**: gets frames from the Pi over USB serial and drives the 7 LED data lines. A series resistor protects each data line.
- **Power**: one 12V supply (400W).
- **Audio**: small class-D amplifier (YS-LT21) or JBL speaker

## Repo layout

- `pi/`: render loop, animations (`pi/art/`), and the frame sender
- `sink/rp2040-led/`: RP2040 firmware (PlatformIO)
- `sink/simulator/`: browser simulator of the matrix
- `config.js`: shared config; `npm run config:h` generates the firmware `config.h`
- `services/`: systemd units for the Pi (`hardbreaks.service` runs the animation, `bt-speaker.service` keeps the Bluetooth speaker connected; setup steps inside each)

## Before launch

- **Protect the Pi's SD card.** Shutting down means pulling the plug, which can corrupt the card. Turn on the read-only overlay: `sudo raspi-config` → Performance Options → Overlay File System → Yes (also write-protect the boot partition), then reboot. Writes go to RAM and are lost on reboot. To update the code, turn the overlay off, reboot, make the change, then turn it back on.
- **Bring a spare.** Clone the finished card to a second SD card.
