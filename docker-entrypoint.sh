#!/bin/sh
# Server Deck container entrypoint.
#
# The keys folder is bind-mounted and shared between the host user and the
# container. For that to actually work — both sides able to read and manage the
# same files — the container's `node` user must own them with the host user's
# UID/GID. This script aligns that ownership (PUID/PGID), locks down key
# permissions on boot (so keys dropped manually with loose modes are fixed),
# then drops root and hands off to the app.
set -e

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
KEY_DIR="${SERVERDECK_KEY_UPLOAD_DIR:-/keys}"

if [ "$(id -u)" = "0" ]; then
  # Re-map the node user/group to the host UID/GID when they differ.
  CURRENT_GID="$(getent group node | cut -d: -f3)"
  if [ -n "$CURRENT_GID" ] && [ "$CURRENT_GID" != "$PGID" ]; then
    groupmod -o -g "$PGID" node
  fi
  CURRENT_UID="$(id -u node)"
  if [ "$CURRENT_UID" != "$PUID" ]; then
    usermod -o -u "$PUID" node
  fi

  # The app writes state here; make sure node owns it after any UID change.
  chown -R node:node /app/data 2>/dev/null || true

  # Shared key folder: take ownership, then enforce 0700 dir / 0600 keys.
  if [ -d "$KEY_DIR" ]; then
    chown node:node "$KEY_DIR" 2>/dev/null || true
    chmod 700 "$KEY_DIR" 2>/dev/null || true
    find "$KEY_DIR" -maxdepth 1 -type f ! -name '*.pub' -exec chmod 600 {} + 2>/dev/null || true
    find "$KEY_DIR" -maxdepth 1 -type f -exec chown node:node {} + 2>/dev/null || true
  fi

  exec gosu node "$@"
fi

# Already running as a non-root user (e.g. a compose `user:` override) — the
# UID/permission dance is the host's responsibility in that case.
exec "$@"
