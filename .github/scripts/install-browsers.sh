#!/usr/bin/env bash
# Installs the Playwright browsers and their system packages, giving each
# attempt its own time limit and retrying once per extra limit.
#
#   install-browsers.sh [limit ...]     default: 3m 4m
#
# Each limit is one attempt, in `timeout` format (e.g. 15s, 3m). The system
# packages come from the Ubuntu mirror, which is sometimes very slow; a limit
# per attempt means a slow mirror costs minutes rather than the whole job.
# Healthy installs take about 40-55s.
#
# Outputs (when run in GitHub Actions): attempts, stopped_apt.
# The CI self-test (.github/workflows/ci-selftest.yml) forces the retry path.
set -uo pipefail

limits=("$@")
[ ${#limits[@]} -gt 0 ] || limits=(3m 4m)

output() {
    if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1=$2" >> "$GITHUB_OUTPUT"; fi
}

stopped_apt=false
attempt=0
for limit in "${limits[@]}"; do
    attempt=$((attempt + 1))
    if timeout --kill-after=30s "$limit" npx playwright install --with-deps; then
        echo "Browsers installed on attempt $attempt"
        output attempts "$attempt"
        output stopped_apt "$stopped_apt"
        exit 0
    fi
    echo "::warning::Browser install attempt $attempt failed or exceeded $limit"

    # Playwright starts apt-get through sudo, so timeout can't stop it: stop it
    # here, wait for the package lock, and finish any package setup the
    # stopped attempt left half-done
    if sudo pkill -KILL -x apt-get; then
        stopped_apt=true
        echo "Stopped a leftover apt-get"
    fi
    sudo pkill -KILL -x dpkg || true
    for _ in $(seq 60); do
        sudo fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock > /dev/null 2>&1 || break
        sleep 1
    done
    sudo dpkg --configure -a || true
done

echo "::error::Browser install failed after $attempt attempts"
output attempts "$attempt"
output stopped_apt "$stopped_apt"
exit 1
