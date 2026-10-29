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

## Debugging
for DEBUG log set DEBUG=1 (env varaible of hardbreak service)

useful logs:
systemctl status hardbreaks                          # running? last few lines
journalctl -u hardbreaks -f                          # follow live (Ctrl-C to stop)
journalctl -u hardbreaks --since "-10 min"           # a time window
systemctl show hardbreaks -p NRestarts               # how many times it restarted
journalctl -u bt-speaker -f                          # the speaker watchdog
bluetoothctl devices Connected                       # connected Bluetooth devices (empty = none)
bluetoothctl show | grep -E "Powered|PowerState"     # is the Pi's Bluetooth on?
journalctl -u bluetooth -u bt-speaker --since "-20 min" -p info   # Bluetooth logs, last 20 min, info level and more severe (incl. warnings)

## Changing the default speaker (on the Pi)
```
bluetoothctl --timeout 10 scan on               # nearby devices and their MACs
nano ~/HardBreaks/services/bt-speaker.env       # SPEAKER_MAC=<MAC>: the Pi pairs it and switches to it
journalctl -u bt-speaker -f                     # wait for "switched to the default speaker ..."
```

## Bluetooth by hand (on the Pi)
```
sudo systemctl stop bt-speaker                  # so it doesn't interfere; start it again when done
bluetoothctl --timeout 10 scan on               # nearby devices (speaker in pairing mode)
bluetoothctl --agent NoInputNoOutput pair <MAC> && bluetoothctl trust <MAC> && bluetoothctl connect <MAC>
bluetoothctl devices Paired                     # devices the Pi knows
bluetoothctl info <MAC>                         # paired / trusted / connected, signal
bluetoothctl remove <MAC>                       # forget it (then pair again)
sudo rfkill unblock bluetooth && bluetoothctl power on   # Bluetooth off ("PowerState: off-blocked")
sudo systemctl restart bluetooth                # Bluetooth stuck
sudo systemctl start bt-speaker
ffplay -nodisp -autoexit audio/2026-10-23-HHG6-female.mp3      Play some audio test
```

## No sound (on the Pi)
```
pactl list short sinks                          # no "bluez_output" line = speaker linked but no audio
bluetoothctl connect <MAC> 0000110b-0000-1000-8000-00805f9b34fb   # reconnect its audio only
bluetoothctl disconnect <MAC>; bluetoothctl connect <MAC>         # reconnect the speaker
systemctl --user restart wireplumber pipewire pipewire-pulse      # the Pi's audio system is stuck
```

## Stopping the speaker watchdog (on the Pi)
```
sudo systemctl stop bt-speaker                  # until the next reboot
sudo systemctl disable --now bt-speaker         # for good, also after reboots
sudo systemctl enable --now bt-speaker          # back on
```
