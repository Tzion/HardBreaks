#!/bin/bash
# Deploys HardBreaks from this machine to the Pi.
#   ./deploy.sh pi           sync the code, reinstall dependencies if they changed, restart the animation
#   ./deploy.sh services     sync the code, install, enable and restart the systemd units in services/
#   ./deploy.sh controller   sync the code, flash the RP2040 from the Pi (it's plugged into the Pi), restart the animation
#   ./deploy.sh all          all of the above
# Targets can be combined: ./deploy.sh pi services
# --no-restart: don't restart anything at the end (after controller, the animation stays stopped)
set -euo pipefail

PI_HOST="${PI_HOST:-pi@raspberrypi}"
PI_DIR=/home/pi/HardBreaks
CONTROLLER_PORT=/dev/ttyACM0

cd "$(dirname "$0")"

usage() {
    echo "Usage: ./deploy.sh <target>... [--no-restart]   targets: pi, services, controller, all"
    exit 1
}

# Mirror the repo into PI_DIR. --delete removes files that are gone from the repo;
# excluded paths are neither sent nor deleted on the Pi.
synced=""
sync_code() {
    [ -n "$synced" ] && return
    echo "==> syncing code to $PI_HOST:$PI_DIR"
    # .git/ is the Pi's own clone, node_modules/ and .pio/ are built on the Pi for ARM,
    # onepager/ goes to Netlify, and the root *.png files are debug frames the Pi writes.
    rsync -az --delete --itemize-changes \
        --exclude .git/ \
        --exclude .claude/ \
        --exclude node_modules/ \
        --exclude .pio/ \
        --exclude onepager/ \
        --exclude creative-coding-course/ \
        --exclude .vscode/ \
        --exclude .netlify/ \
        --exclude '.env*' \
        --exclude .DS_Store \
        --exclude '/*.png' \
        --exclude /.image_to_pixelize.jpg \
        ./ "$PI_HOST:$PI_DIR/"
    synced=yes
}

no_restart=""
restart() {
    if [ -n "$no_restart" ]; then
        echo "==> not restarting $* (--no-restart)"
        return
    fi
    echo "==> restarting $*"
    ssh "$PI_HOST" "sudo systemctl restart $*"
}

# node_modules/.deployed-lock is the synced lockfile of the last successful install.
# If the synced lockfile differs (or the last install never finished), install again.
# npm install only changes what's different, so canvas (compiled on the Pi, slow) isn't rebuilt
# unless it has to be. The copy is taken before installing, because npm install may rewrite the lockfile.
deploy_pi() {
    sync_code
    ssh "$PI_HOST" bash -s -- "$PI_DIR" <<'EOF'
set -e
cd "$1"
cmp -s package-lock.json node_modules/.deployed-lock && exit 0
echo "==> dependencies changed, running npm install"
cp package-lock.json /tmp/deployed-lock
npm install
# An interrupted install can leave canvas without its compiled binary
node -e "require('canvas')" 2>/dev/null || { echo "==> canvas binary missing, rebuilding (slow)"; npm rebuild canvas; }
mv /tmp/deployed-lock node_modules/.deployed-lock
EOF
    restart hardbreaks
}

deploy_services() {
    sync_code
    local units
    units=$(cd services && echo *.service)
    echo "==> installing $units"
    ssh "$PI_HOST" "cd $PI_DIR/services && sudo cp $units /etc/systemd/system/ \
        && sudo systemctl daemon-reload \
        && sudo systemctl enable $units"
    restart $units
}

# The animation holds the serial port, so it's stopped while flashing.
# It's started again even if flashing fails, then the failure is reported.
deploy_controller() {
    sync_code
    echo "==> flashing the RP2040 on $CONTROLLER_PORT"
    local rc=0
    ssh "$PI_HOST" "cd $PI_DIR && node pi/generate-config-h.js \
        && sudo systemctl stop hardbreaks \
        && pio run -d sink/rp2040-led -t upload --upload-port $CONTROLLER_PORT" || rc=$?
    restart hardbreaks
    return $rc
}

targets=()
for arg in "$@"; do
    case "$arg" in
        pi | services | controller) targets+=("$arg") ;;
        all) targets+=(pi services controller) ;;
        --no-restart) no_restart=yes ;;
        *) usage ;;
    esac
done
[ ${#targets[@]} -eq 0 ] && usage

for target in "${targets[@]}"; do
    "deploy_$target"
done
echo "==> done"
