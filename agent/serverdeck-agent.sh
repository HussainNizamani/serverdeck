#!/bin/sh
set -eu

CONFIG_FILE="${SERVERDECK_CONFIG:-/etc/serverdeck-agent.conf}"
AGENT_VERSION="0.1.0"

if [ -r "$CONFIG_FILE" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG_FILE"
fi

: "${SERVERDECK_ENDPOINT:?SERVERDECK_ENDPOINT is required}"
: "${SERVERDECK_SERVER_ID:?SERVERDECK_SERVER_ID is required}"
: "${SERVERDECK_TOKEN:?SERVERDECK_TOKEN is required}"

ENDPOINT="${SERVERDECK_ENDPOINT%/}"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g'
}

json_string() {
  printf '"%s"' "$(json_escape "$1")"
}

os_field() {
  key="$1"
  if [ -r /etc/os-release ]; then
    awk -F= -v key="$key" '
      $1 == key {
        value=$2
        gsub(/^"/, "", value)
        gsub(/"$/, "", value)
        print value
        exit
      }
    ' /etc/os-release
  fi
}

num_or_zero() {
  value="$1"
  case "$value" in
    ''|*[!0-9.]*)
      printf '0'
      ;;
    *)
      printf '%s' "$value"
      ;;
  esac
}

NOW="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date)"
HOSTNAME_VALUE="$(hostname 2>/dev/null || uname -n 2>/dev/null || printf 'unknown')"
KERNEL_VALUE="$(uname -r 2>/dev/null || printf 'unknown')"
CPU_COUNT="$(getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || printf '0')"
PROCESS_COUNT="$(ps -e 2>/dev/null | wc -l | awk '{ print $1 }' || printf '0')"
OS_ID="$(os_field ID || true)"
OS_NAME="$(os_field NAME || true)"
OS_VERSION_ID="$(os_field VERSION_ID || true)"
OS_PRETTY_NAME="$(os_field PRETTY_NAME || true)"

UPTIME_SECONDS="0"
if [ -r /proc/uptime ]; then
  UPTIME_SECONDS="$(awk '{ printf "%d", $1 }' /proc/uptime 2>/dev/null || printf '0')"
fi

LOAD_ONE="0"
LOAD_FIVE="0"
LOAD_FIFTEEN="0"
if [ -r /proc/loadavg ]; then
  set -- $(cat /proc/loadavg)
  LOAD_ONE="$(num_or_zero "${1:-0}")"
  LOAD_FIVE="$(num_or_zero "${2:-0}")"
  LOAD_FIFTEEN="$(num_or_zero "${3:-0}")"
fi

MEM_TOTAL="0"
MEM_AVAILABLE="0"
SWAP_TOTAL="0"
SWAP_FREE="0"
if [ -r /proc/meminfo ]; then
  MEM_TOTAL="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo 2>/dev/null || printf '0')"
  MEM_AVAILABLE="$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo 2>/dev/null || printf '0')"
  SWAP_TOTAL="$(awk '/^SwapTotal:/ { print $2 }' /proc/meminfo 2>/dev/null || printf '0')"
  SWAP_FREE="$(awk '/^SwapFree:/ { print $2 }' /proc/meminfo 2>/dev/null || printf '0')"
fi
MEM_USED_PERCENT="0"
if [ "$MEM_TOTAL" -gt 0 ] 2>/dev/null; then
  MEM_USED_PERCENT="$(awk -v total="$MEM_TOTAL" -v avail="$MEM_AVAILABLE" 'BEGIN { printf "%.1f", ((total-avail)/total)*100 }')"
fi

DISK_JSON="[]"
DISK_LINE="$(df -P -k / 2>/dev/null | awk 'NR==2 { gsub("%", "", $5); printf "%s|%s|%s|%s|%s|%s", $1, $2, $3, $4, $5, $6 }' || true)"
if [ -n "$DISK_LINE" ]; then
  old_ifs="$IFS"
  IFS='|'
  set -- $DISK_LINE
  IFS="$old_ifs"
  DISK_JSON='[{"filesystem":'"$(json_string "${1:-}")"',"size_kb":'"${2:-0}"',"used_kb":'"${3:-0}"',"available_kb":'"${4:-0}"',"used_percent":'"${5:-0}"',"mount":'"$(json_string "${6:-/}")"'}]'
fi

FAILED_JSON="[]"
if command -v systemctl >/dev/null 2>&1; then
  FAILED_SERVICES="$(systemctl --failed --no-legend --no-pager 2>/dev/null | awk '{ print $1 }' | head -20 || true)"
  if [ -n "$FAILED_SERVICES" ]; then
    FAILED_JSON="["
    first=1
    for service in $FAILED_SERVICES; do
      if [ "$first" -eq 0 ]; then
        FAILED_JSON="$FAILED_JSON,"
      fi
      FAILED_JSON="$FAILED_JSON$(json_string "$service")"
      first=0
    done
    FAILED_JSON="$FAILED_JSON]"
  fi
fi

PAYLOAD='{
  "agent_version": '"$(json_string "$AGENT_VERSION")"',
  "collected_at": '"$(json_string "$NOW")"',
  "hostname": '"$(json_string "$HOSTNAME_VALUE")"',
  "kernel": '"$(json_string "$KERNEL_VALUE")"',
  "cpu_count": '"$CPU_COUNT"',
  "process_count": '"$PROCESS_COUNT"',
  "os": {
    "id": '"$(json_string "$OS_ID")"',
    "name": '"$(json_string "$OS_NAME")"',
    "version_id": '"$(json_string "$OS_VERSION_ID")"',
    "pretty_name": '"$(json_string "$OS_PRETTY_NAME")"'
  },
  "uptime_seconds": '"$UPTIME_SECONDS"',
  "load": {
    "one": '"$LOAD_ONE"',
    "five": '"$LOAD_FIVE"',
    "fifteen": '"$LOAD_FIFTEEN"'
  },
  "memory": {
    "total_kb": '"$MEM_TOTAL"',
    "available_kb": '"$MEM_AVAILABLE"',
    "used_percent": '"$MEM_USED_PERCENT"',
    "swap_total_kb": '"$SWAP_TOTAL"',
    "swap_free_kb": '"$SWAP_FREE"'
  },
  "disk": '"$DISK_JSON"',
  "failed_services": '"$FAILED_JSON"'
}'

REPORT_URL="$ENDPOINT/api/agent/$SERVERDECK_SERVER_ID/report"

if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 20 \
    -H "Content-Type: application/json" \
    -H "X-ServerDeck-Token: $SERVERDECK_TOKEN" \
    --data-binary "$PAYLOAD" \
    "$REPORT_URL"
elif command -v wget >/dev/null 2>&1; then
  wget -qO- \
    --header="Content-Type: application/json" \
    --header="X-ServerDeck-Token: $SERVERDECK_TOKEN" \
    --post-data="$PAYLOAD" \
    "$REPORT_URL"
else
  printf '%s\n' "serverdeck-agent: curl or wget is required" >&2
  exit 1
fi

printf '\n'
