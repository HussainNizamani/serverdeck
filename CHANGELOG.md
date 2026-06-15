# Changelog

All notable changes to Server Deck are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-06-15

### Added

- **SSH key management from the web UI.** A new **SSH keys** section in SSH
  Settings lists the keys in your shared keys folder. Each server's key(s) are
  chosen by tapping rows in that list — a ✓ marks selected keys, and you can
  select **several** keys for one server (SSH tries each in turn until one
  authenticates). This replaces the old single "SSH key" dropdown.
- **Web key upload.** An **Upload key** button accepts a private key from the
  browser. Uploads are validated as real OpenSSH/PEM/PPK keys (passphrase-
  protected keys included), the filename is sanitized against path traversal,
  the file is written `0600`, and an extensionless name gets `.key` appended so
  it stays discoverable. The button is gated behind a warning that recommends
  dropping the key in the folder or transferring it over SFTP instead — web
  upload is a fallback.
- **In-app keys file browser ("Open folder").** Opens the same file-manager UI
  used for servers, but backed by the local keys folder and locked strictly to
  it: browse, upload, download, rename, and delete keys. No SSH/FTP session is
  involved — the folder is local to the panel.
- **Unsaved-changes guard in SSH Settings.** Editing any field or key selection
  and then navigating away (another server, the feature nav, New server, Open
  folder, duplicate, or closing the tab) prompts a Save / Discard / Cancel
  dialog so changes are never lost silently. The periodic background refresh no
  longer clobbers an in-progress edit either.

### Changed

- **One shared keys directory.** The keys folder is now the single location
  Server Deck reads keys from and writes uploads to — `~/.ssh` and the previous
  multi-directory scan were removed. It is bind-mounted **read-write** (was
  read-only) so uploads and permission enforcement work.
- **Folder-wide permission enforcement.** The directory is forced to `0700` and
  every private key to `0600` on container boot and after each upload/delete,
  so a key dropped in with loose modes (e.g. `0777`) is corrected automatically.
- **UID-aligned container entrypoint.** A new `docker-entrypoint.sh` aligns the
  container user to your host `PUID`/`PGID`, takes ownership of the keys folder
  so the same files are manageable from both your terminal and the panel, then
  drops from root to the unprivileged `node` user (via `gosu`) before starting.
- Multiple keys per server are stored newline-separated in the existing
  `key_path` column — **no database migration is required** and existing
  single-key servers keep working unchanged.

## [1.1.1] - 2026-06-12

### Added

- **New Terminal tab** (replaces the single-session Terminal view): open up to 10 SSH terminals side by side in a
  resizable, drag-to-rearrange grid (powered by dockview-core). Mix servers
  freely, per-pane server picker with color-coded identity strips, maximize
  per pane, Alt+1-9 to jump between panes, disconnect overlay with one-click
  reconnect, and the layout persists across reloads.
- Collapsible feature nav (left menu) plus a "Focus mode" button that
  collapses both side menus at once for maximum terminal space; collapse
  states persist across reloads.
- **Duplicate server**: a three-dot menu on each server row clones the full
  profile (key, encrypted password, group, tags, notes) with an
  auto-incremented name ("Dubai General 1" -> "Dubai General 2").
- **Broadcast input** in the terminal grid: send a command to every marked
  terminal at once via a line-buffered command bar (nothing is sent until
  Enter), with an optional "Live keys" mode that mirrors raw keystrokes
  (tmux synchronize-panes style). Receiving panes get an unmissable red
  striped warning, each pane can be excluded, and broadcast auto-disables
  when a pane closes or changes server.

### Fixed

- Collapsing the server list now actually reclaims the freed space for the
  main content area (the shell grid previously kept the full column width).

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
