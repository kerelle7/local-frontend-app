#!/usr/bin/env bash
# Installs the Playwright browsers and their system packages, giving each
# attempt its own time limit and retrying once per extra limit.
#
#   install-browsers.sh [limit ...]     default: 3m 4m
#
# Each limit is one attempt, in `timeout` format (e.g. 15s, 3m). The system
# packages come from the Ubuntu mirror, which is sometimes very slow; a limit
# per attempt means a slow mirror costs minutes rather than the whole job, and
# retries use a different mirror. Healthy installs take about 40-55s.
#
# Outputs (when run in GitHub Actions): attempts, last_attempt_seconds,
# stopped_apt, switched_mirror.
# The CI self-test (.github/workflows/ci-selftest.yml) forces the retry path.
set -uo pipefail

limits=("$@")
[ ${#limits[@]} -gt 0 ] || limits=(3m 4m)

output() {
    if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1=$2" >> "$GITHUB_OUTPUT"; fi
}

# A retry on the same mirror is just as slow when the mirror is the problem,
# so later attempts use Ubuntu's main mirror instead of the runner's default
# (Azure). Runners list their mirrors in apt-mirrors.txt; source files that
# name the Azure mirror directly are updated too, in case that ever changes.
ALT_MIRROR=http://archive.ubuntu.com/ubuntu/
switch_mirror() {
    if [ -f /etc/apt/apt-mirrors.txt ]; then
        echo "Mirror list before switching:"
        sed 's/^/  /' /etc/apt/apt-mirrors.txt
        echo "$ALT_MIRROR" | sudo tee /etc/apt/apt-mirrors.txt > /dev/null
    fi
    for f in /etc/apt/sources.list /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list; do
        [ -f "$f" ] && sudo sed -i "s#https\?://azure\.archive\.ubuntu\.com/ubuntu/\?#${ALT_MIRROR}#g" "$f"
    done
    echo "Using $ALT_MIRROR for the next attempt"
    switched_mirror=true
}

stopped_apt=false
switched_mirror=false
attempt=0
for limit in "${limits[@]}"; do
    attempt=$((attempt + 1))
    started=$SECONDS
    if timeout --kill-after=30s "$limit" npx playwright install --with-deps; then
        echo "Browsers installed on attempt $attempt in $((SECONDS - started))s"
        output attempts "$attempt"
        output last_attempt_seconds "$((SECONDS - started))"
        output stopped_apt "$stopped_apt"
        output switched_mirror "$switched_mirror"
        exit 0
    fi
    echo "::warning::Browser install attempt $attempt failed or exceeded $limit"

    # Playwright starts apt-get through sudo, so timeout can't stop it: stop it
    # here, along with its download helpers (separate processes that would
    # otherwise keep downloading), wait for the package lock, and finish any
    # package setup the stopped attempt left half-done
    echo "Package processes left by attempt $attempt:"
    pgrep -a -f 'apt-get|/usr/lib/apt/methods/|dpkg' || echo "  (none)"
    if sudo pkill -KILL -x apt-get; then
        stopped_apt=true
        echo "Stopped a leftover apt-get"
    fi
    sudo pkill -KILL -f '^/usr/lib/apt/methods/' || true
    sudo pkill -KILL -x dpkg || true
    for _ in $(seq 60); do
        sudo fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock > /dev/null 2>&1 || break
        sleep 1
    done
    sudo dpkg --configure -a || true

    if [ "$attempt" -lt ${#limits[@]} ] && [ "$switched_mirror" = false ]; then
        switch_mirror
    fi
done

echo "::error::Browser install failed after $attempt attempts"
output attempts "$attempt"
output stopped_apt "$stopped_apt"
output switched_mirror "$switched_mirror"
exit 1
