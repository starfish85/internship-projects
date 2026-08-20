#!/usr/bin/env bash
# Install a user launchd agent to monitor CodexArchive every N minutes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INTERVAL_MIN="${INTERVAL_MIN:-30}"
LABEL="com.hbx.hotel-cn-crawl.disk-monitor"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${ROOT}/artifacts/logs"
mkdir -p "${LOG_DIR}"
mkdir -p "${HOME}/Library/LaunchAgents"

cat > "${PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/monitor-external-disk.sh</string>
  </array>
  <key>StartInterval</key>
  <integer>$((INTERVAL_MIN * 60))</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/disk-monitor-launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/disk-monitor-launchd.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${HOME}/.local/bin:${HOME}/.local/sbin</string>
  </dict>
</dict>
</plist>
EOF

launchctl unload "${PLIST}" 2>/dev/null || true
launchctl load "${PLIST}"
echo "Installed launchd agent: ${LABEL}"
echo "Plist: ${PLIST}"
echo "Interval: every ${INTERVAL_MIN} minutes"
echo "Manual run: bash ${ROOT}/scripts/monitor-external-disk.sh"
echo "Uninstall: launchctl unload ${PLIST} && rm ${PLIST}"
