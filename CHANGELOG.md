# Changelog

All notable changes to Server Deck are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-06-11

### Added

- **SSH password authentication** for servers without key access. Works
  across panels, terminal, and SFTP; supports both `password` and
  `keyboard-interactive` methods. Passwords are stored encrypted
  (AES-256-GCM) and never returned by the API; an optional
  `SERVERDECK_SECRET` keeps the encryption key out of the database.
  Password-authenticated panel tasks run through the ssh2 library.

## [1.0.0] - 2026-06-10

First stable open-source release.

### Added

- Server inventory with groups, tags, notes, bubble labels, health dots, and
  search; selection and active tab persist across reloads.
- Operation panels over SSH: overview (with parsed metrics), services and
  service actions, logs, storage, network, processes, updates, containers,
  users, security, and custom commands — each refresh stored with a timestamp
  and shown again on revisit.
- Real web terminal: xterm.js frontend + ssh2 shell backend over WebSocket,
  with resize propagation and multiple tabbed sessions per server.
- SFTP file manager: browse, upload, download, rename, delete, mkdir.
- Authentication: single-account email + password (scrypt), optional TOTP
  two-factor, 30-day revocable cookie sessions, login rate limiting.
- Tailscale-first networking: port published on localhost + Tailscale IP only,
  plus an application-level source-network allowlist.
- Optional hourly POSIX-shell monitoring agent with one-line installer
  (systemd timer or cron).
- Storage backends: PostgreSQL (Docker default) or a single JSON file.
- PuTTY `.ppk` key support via in-memory puttygen conversion; SSH key
  discovery and host→container path remapping.
- Dark/light themes with five accent colors.
- Docker Compose deployment with SELinux-compatible key mounts.
