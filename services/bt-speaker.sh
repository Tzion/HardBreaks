#!/bin/bash
# Keeps the Pi connected to a Bluetooth speaker WITH WORKING AUDIO. Run by bt-speaker.service. Never exits.
# A speaker only counts when its audio channel (the A2DP "transport") is up: a Bluetooth link without it plays
# nothing. Every check:
#   0. The default speaker (SPEAKER_MAC in bt-speaker.env) changed: switch to it. It's paired on the spot if the
#      Pi doesn't know it yet, and only once its audio works are the other speakers dropped, so audio never stops
#      while the new one isn't found. Until then, it keeps trying every check.
#   1. A connected speaker without audio is repaired: reconnect its audio, then the whole speaker; after 3 failed
#      repairs in a row, restart the Pi's Bluetooth.
#   2. A speaker with audio is connected: keep it (a working replacement stays, even when the default one is back)
#      and disconnect any other speaker, the default one winning if both are there, so audio never jumps.
#   3. Otherwise reconnect a known speaker: the default one first, then any audio device paired before. So when a
#      borrowed speaker goes away, the installation's speaker comes back.
#   4. No speaker for FALLBACK_AFTER_S seconds: scan for an audio device right next to the Pi (signal at least
#      MIN_RSSI), pair it on the spot (no PIN), trust it and connect. It's remembered, so step 3 finds it next time.
# Logs only changes and repairs, so the journal stays small.

CONFIG="$(dirname "$0")/bt-speaker.env" # read every check: editing it on the Pi takes effect without a restart
SWITCHED=/var/lib/bt-speaker/default    # the default speaker last switched to, so a change is noticed after restarts too
CHECK_EVERY=10 # seconds between checks
SCAN_FOR=10    # seconds of scanning when looking for a speaker that isn't paired
A2DP_SINK=0000110b-0000-1000-8000-00805f9b34fb # the Bluetooth audio profile speakers play through

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

field() { bt info "$1" 2>/dev/null | awk -v key="$2:" '$1 == key {sub(/^[^:]*: */, ""); print; exit}'; }
name() { field "$1" Name; }
is_connected() { [ "$(field "$1" Connected)" = yes ]; }
is_paired() { [ "$(field "$1" Paired)" = yes ]; }
# Signal strength in dBm, from "RSSI: -60" or "RSSI: 0xffffffc4 (-60)"; only known right after a scan
rssi() { field "$1" RSSI | awk '{v = $NF; gsub(/[()]/, "", v); print v}'; }

# Its audio channel is up: BlueZ has an A2DP transport for it (/org/bluez/hci0/dev_XX/sepN/fdN)
has_audio() { busctl --list tree org.bluez 2>/dev/null | grep -q "/dev_${1//:/_}/sep[0-9]*/fd[0-9]*$"; }

# Something that can play audio: it offers an Audio Sink, or its device class is audio/video (major class 4)
is_audio_device() {
    local info class
    info=$(bt info "$1" 2>/dev/null)
    grep -q "UUID: Audio Sink" <<<"$info" && return 0
    class=$(awk '$1 == "Class:" {print $2; exit}' <<<"$info")
    [ -n "$class" ] && [ $(( (class >> 8) & 0x1F )) -eq 4 ]
}

macs() { bt devices "$@" 2>/dev/null | awk '{print $2}'; }

load_config() {
    SPEAKER_MAC="" FALLBACK_AFTER_S=30 MIN_RSSI=-65
    [ -f "$CONFIG" ] && . "$CONFIG"
    DEFAULT=$SPEAKER_MAC FALLBACK_AFTER=$FALLBACK_AFTER_S
}

# The default speaker first, then the other paired audio devices
known_speakers() {
    [ -n "$DEFAULT" ] && echo "$DEFAULT"
    for mac in $(macs Paired); do
        [ "$mac" != "$DEFAULT" ] && is_audio_device "$mac" && echo "$mac"
    done
}

# Connected speakers, the default one first
connected_speakers() {
    local connected
    connected=$(macs Connected)
    [ -n "$DEFAULT" ] && grep -qx "$DEFAULT" <<<"$connected" && echo "$DEFAULT"
    for mac in $connected; do
        [ "$mac" != "$DEFAULT" ] && is_audio_device "$mac" && echo "$mac"
    done
}

working_speaker() { # a connected speaker whose audio is up (nothing if none)
    for mac in $(connected_speakers); do
        has_audio "$mac" && { echo "$mac"; return; }
    done
}

scan() { bt --timeout "$SCAN_FOR" scan on >/dev/null 2>&1; }

# Print the unpaired audio device with the strongest signal above MIN_RSSI, from the last scan (nothing if none)
find_new_speaker() {
    local paired r
    paired=$(macs Paired)
    for mac in $(macs); do
        grep -qx "$mac" <<<"$paired" && continue
        is_audio_device "$mac" || continue
        r=$(rssi "$mac")
        [ -n "$r" ] && [ "$r" -ge "$MIN_RSSI" ] && echo "$r $mac"
    done | sort -rn | awk 'NR == 1 {print $2}'
}

# Pair without a PIN (the "just works" pairing speakers use), trust so it reconnects later, connect
adopt() {
    local mac=$1 label
    label="$(name "$mac") ($mac, signal $(rssi "$mac") dBm)"
    echo "found $label, pairing"
    timeout 40 bluetoothctl --agent NoInputNoOutput pair "$mac" >/dev/null 2>&1
    bt trust "$mac" >/dev/null 2>&1
    bt connect "$mac" >/dev/null 2>&1
    sleep 2
    if has_audio "$mac"; then
        echo "paired and connected $label"
    elif is_connected "$mac"; then
        echo "paired and connected $label, but no audio yet"
    else
        echo "pairing with $label failed"
        bt remove "$mac" >/dev/null 2>&1 # don't keep a half-paired device
    fi
}

# A connected speaker without audio: reconnect its audio profile, then the whole speaker.
# After 3 failed repairs in a row, restart the Pi's Bluetooth. True when its audio works again.
failed_repairs=0
repair_audio() {
    local mac=$1
    echo "$(name "$mac") ($mac) is connected but has no audio, reconnecting its audio"
    bt connect "$mac" "$A2DP_SINK" >/dev/null 2>&1
    sleep 2
    has_audio "$mac" && { echo "audio is back"; failed_repairs=0; return 0; }
    echo "still no audio, reconnecting the speaker"
    bt disconnect "$mac" >/dev/null 2>&1
    sleep 2
    bt connect "$mac" >/dev/null 2>&1
    sleep 3
    has_audio "$mac" && { echo "audio is back"; failed_repairs=0; return 0; }
    failed_repairs=$((failed_repairs + 1))
    if [ "$failed_repairs" -ge 3 ]; then
        echo "audio failed $failed_repairs times in a row, restarting Bluetooth"
        systemctl restart bluetooth
        sleep 5
        failed_repairs=0
    fi
    return 1
}

# Connect the default speaker, pairing it first if the Pi doesn't know it. It was chosen on purpose,
# so it isn't checked for being an audio device or close. True when its audio works.
connect_default() {
    has_audio "$DEFAULT" && return 0
    if ! is_paired "$DEFAULT"; then
        scan
        [ -n "$(rssi "$DEFAULT")" ] && adopt "$DEFAULT" # only when the scan saw it
    elif ! is_connected "$DEFAULT"; then
        bt connect "$DEFAULT" >/dev/null 2>&1
        sleep 2
    fi
    is_connected "$DEFAULT" && ! has_audio "$DEFAULT" && repair_audio "$DEFAULT"
    has_audio "$DEFAULT"
}

declare -A logged
note() { # log each kind of state once when it changes, not every check (an empty message just resets it)
    [ "${logged[$1]}" != "$2" ] && [ -n "$2" ] && echo "$2"
    logged[$1]=$2
}

mkdir -p "$(dirname "$SWITCHED")"
missing_since=""
while true; do
    load_config
    ensure_adapter

    if [ -z "$DEFAULT" ]; then
        note default "no default speaker (set SPEAKER_MAC in $CONFIG)"
    elif [ "$DEFAULT" != "$(cat "$SWITCHED" 2>/dev/null)" ]; then
        note default "default speaker is now $DEFAULT, switching to it as soon as it's found"
        if connect_default; then
            echo "$DEFAULT" > "$SWITCHED"
            note default "switched to the default speaker $(name "$DEFAULT") ($DEFAULT)"
        fi
    fi

    # The speaker in use: the first connected one whose audio works (or can be repaired)
    current=""
    for mac in $(connected_speakers); do
        if has_audio "$mac" || repair_audio "$mac"; then
            current=$mac
            break
        fi
    done

    if [ -n "$current" ]; then
        note speaker "speaker connected: $(name "$current") ($current)"
        note fallback ""
        missing_since=""
        # Only one speaker at a time, so audio never jumps to another one
        for mac in $(connected_speakers); do
            [ "$mac" != "$current" ] && { echo "disconnecting $(name "$mac") ($mac): $(name "$current") is in use"; bt disconnect "$mac" >/dev/null 2>&1; }
        done
    else
        [ -n "$missing_since" ] || missing_since=$(date +%s)
        note speaker "no speaker with audio, reconnecting known speakers every ${CHECK_EVERY}s"
        for mac in $(known_speakers); do
            bt connect "$mac" >/dev/null 2>&1
            sleep 2
            has_audio "$mac" && break
        done
        if [ -z "$(working_speaker)" ] && [ $(( $(date +%s) - missing_since )) -ge "$FALLBACK_AFTER" ]; then
            note fallback "no known speaker for ${FALLBACK_AFTER}s, also looking for a new speaker nearby"
            scan
            new=$(find_new_speaker)
            [ -n "$new" ] && adopt "$new"
        fi
    fi
    sleep "$CHECK_EVERY"
done
