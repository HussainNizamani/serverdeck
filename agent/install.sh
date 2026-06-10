#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  printf '%s\n' "Run this installer with sudo or as root." >&2
  exit 1
fi

if [ "$#" -ne 3 ]; then
  printf '%s\n' "Usage: install.sh <serverdeck-endpoint> <server-id> <agent-token>" >&2
  exit 1
fi

ENDPOINT="${1%/}"
SERVER_ID="$2"
TOKEN="$3"
BIN_PATH="/usr/local/bin/serverdeck-agent"
CONFIG_PATH="/etc/serverdeck-agent.conf"

download() {
  url="$1"
  dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    printf '%s\n' "curl or wget is required to install Server Deck agent." >&2
    exit 1
  fi
}

download "$ENDPOINT/agent/serverdeck-agent.sh" "$BIN_PATH"
chmod 0755 "$BIN_PATH"

cat > "$CONFIG_PATH" <<EOF_CONF
SERVERDECK_ENDPOINT="$ENDPOINT"
SERVERDECK_SERVER_ID="$SERVER_ID"
SERVERDECK_TOKEN="$TOKEN"
EOF_CONF
chmod 0600 "$CONFIG_PATH"

if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  cat > /etc/systemd/system/serverdeck-agent.service <<EOF_SERVICE
[Unit]
Description=Server Deck hourly server check

[Service]
Type=oneshot
ExecStart=$BIN_PATH
Nice=10
IOSchedulingClass=idle
EOF_SERVICE

  cat > /etc/systemd/system/serverdeck-agent.timer <<EOF_TIMER
[Unit]
Description=Run Server Deck hourly server check

[Timer]
OnBootSec=5min
OnUnitActiveSec=1h
AccuracySec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF_TIMER

  systemctl daemon-reload
  systemctl enable --now serverdeck-agent.timer
  printf '%s\n' "Installed Server Deck agent with a systemd timer."
else
  cat > /etc/cron.d/serverdeck-agent <<EOF_CRON
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 * * * * root $BIN_PATH >/dev/null 2>&1
EOF_CRON
  chmod 0644 /etc/cron.d/serverdeck-agent
  printf '%s\n' "Installed Server Deck agent with cron."
fi

"$BIN_PATH" >/dev/null 2>&1 || true
