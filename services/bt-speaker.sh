#!/bin/bash
# Keeps the Pi connected to the Bluetooth speaker (the YS-LT21 amp). Run by bt-speaker.service.
# Never exits: when the speaker is off it keeps trying, and it reconnects as soon as the speaker is back.
# Logs only changes, so the journal (RAM under the read-only overlay) doesn't fill up.

MAC="${SPEAKER_MAC:?set SPEAKER_MAC in bt-speaker.service}"
CHECK_EVERY=10 # seconds between checks

# bluetoothctl waits forever when bluetoothd is down, so always bound it
bt() { timeout 15 bluetoothctl "$@"; }

powered() { bt show 2>/dev/null | grep -q "Powered: yes"; }

# Bring the adapter up; if it's stuck, restart the Bluetooth stack.
# On the Pi 3B the onboard Bluetooth sits on a UART brought up by hciuart, so restart that too.
ensure_adapter() {
    powered && return
    rfkill unblock bluetooth
    bt power on >/dev/null 2>&1
    powered && return
    echo "adapter not responding, restarting Bluetooth"
    systemctl restart hciuart 2>/dev/null
    systemctl restart bluetooth
    sleep 5
    bt power on >/dev/null 2>&1
}

state=""
while true; do
    ensure_adapter
    if bt info "$MAC" 2>/dev/null | grep -q "Connected: yes"; then
        [ "$state" != connected ] && echo "speaker connected"
        state=connected
    else
        [ "$state" = connected ] && echo "speaker lost, retrying every ${CHECK_EVERY}s"
        state=disconnected
        bt connect "$MAC" >/dev/null 2>&1
    fi
    sleep "$CHECK_EVERY"
done
