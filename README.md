# Server Deck

[![CI](https://github.com/HussainNizamani/serverdeck/actions/workflows/ci.yml/badge.svg)](https://github.com/HussainNizamani/serverdeck/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/HussainNizamani/serverdeck)](https://github.com/HussainNizamani/serverdeck/releases)

**Server Deck is a self-hosted, single-user server management panel.** Add your
Linux servers once, then manage them all from one clean web UI: live SSH
terminals, an SFTP file manager, service control, logs, storage, network,
processes, package updates, containers, users, security checks, custom
commands, notes, and lightweight hourly health monitoring.

Built to be small and auditable: a plain Node.js backend, a no-build-step
frontend, PostgreSQL (or a single JSON file) for storage, and only four
runtime dependencies ([ssh2](https://www.npmjs.com/package/ssh2),
[xterm.js](https://xtermjs.org/), the fit addon, and
[pg](https://www.npmjs.com/package/pg)).

## Features

- **Server inventory** — groups, tags, notes, status bubbles with health dots,
  and search. Selected server and tab survive page reloads.
- **Real web terminal** — xterm.js (the terminal VS Code uses) connected to an
  ssh2 shell over WebSocket. Full ANSI colors, cursor handling, `vim`/`htop`,
  and auto-resize.
- **Multi-terminal grid** — open up to 10 terminals side by side in a
  resizable, drag-to-rearrange grid (dockview-core). Mix servers freely,
  color-coded per server, maximize any pane, Alt+1–9 to jump, one-click
  reconnect, and the layout survives reloads. A focus mode collapses both
  side menus for maximum terminal space.
- **Broadcast input** — send a command to every marked terminal at once via a
  line-buffered command bar (nothing is sent until Enter), or mirror raw
  keystrokes tmux-style with "Live keys". Receiving panes show an unmissable
  red striped warning, and any pane can be excluded.
- **Duplicate servers** — clone a full server profile (key, encrypted
  password, group, tags, notes) from the three-dot menu on any server row,
  with auto-incremented naming.
- **SFTP file manager** — browse with breadcrumbs, upload, download, rename,
  delete, and create folders over the same SSH connection.
- **Operation panels** — overview, services (start/stop/restart/reload/
  enable/disable), logs, storage, network, processes, updates, containers,
  users, security, and custom commands. Every refresh is stored with a
  timestamp so panels show their last known output even after a restart.
- **Hourly monitoring agent** — an optional ~170-line POSIX shell script that
  runs once per hour (systemd timer or cron), POSTs a small JSON health report
  (load, memory, disk, failed services), and exits. No daemon.
- **Authentication** — email + password (scrypt), optional TOTP two-factor
  (Google Authenticator or any TOTP app), 30-day cookie sessions with a
  device list and per-session revocation, and login rate limiting.
- **Private by design** — the Docker port binds to localhost and your
  Tailscale IP only (never `0.0.0.0`), and the app itself rejects requests
  from non-allowlisted source networks.
- **SSH keys, managed from the UI** — keep keys in one folder, `~/.serverdeck/keys`,
  then pick one or several per server by ticking them (Server Deck tries each until one
  authenticates). Upload keys from the browser (validated, gated behind a
  warning), browse/download/rename/delete them in an in-app file manager, and
  let the panel enforce `0700`/`0600` permissions automatically. OpenSSH and
  PuTTY `.ppk` keys (converted in-memory via `puttygen`) are both supported,
  with path remapping between host and container.
- **Theming** — dark/light mode and five accent colors.

## Requirements

- A Linux host (or anything that runs Docker) to run the panel on
- Docker Engine with the Docker Compose plugin — **or** Node.js ≥ 22 for a
  bare-metal install
- SSH access to the servers you want to manage — keys recommended; password
  authentication is also supported (stored encrypted, see
  [SSH passwords](#ssh-passwords))
- Optional: [Tailscale](https://tailscale.com/) on the panel host and on the
  devices you browse from, for secure remote access

The managed servers themselves need nothing installed except an SSH server.
The optional monitoring agent is plain POSIX `sh` and works on any mainstream
distro (systemd or cron). Server Deck is intentionally light — both the panel
and the agent are comfortable on tiny 1 vCPU / 1 GB machines.

**Tested so far:** panel host on Fedora 44 and Ubuntu 22.04+ (Docker Compose
deployment), managing Ubuntu and Oracle Linux servers. Other distros should
work the same — reports welcome via issues.

## Quick start (Docker, any distro)

```sh
git clone https://github.com/HussainNizamani/serverdeck.git
cd serverdeck
cp .env.example .env        # optional: edit to taste (see Configuration)
docker compose up --build -d
```

Open <http://127.0.0.1:8787>, create your admin account on the first-run
screen, and add your first server. That's it.

> On some distros Docker requires root: prefix the compose commands with
> `sudo`, or add your user to the `docker` group
> (`sudo usermod -aG docker $USER`, then log out and back in).

### Installing Docker per distro

Any reasonably recent Docker works. Official docs:
<https://docs.docker.com/engine/install/>

| Distro | Commands |
| --- | --- |
| **Fedora / RHEL / CentOS Stream / Alma / Rocky** | `sudo dnf install docker docker-compose` (Fedora's Moby build) or follow Docker's repo guide. Then `sudo systemctl enable --now docker` |
| **Debian / Ubuntu / Mint** | `sudo apt install docker.io docker-compose-v2` or Docker's repo guide. Then `sudo systemctl enable --now docker` |
| **Arch / Manjaro** | `sudo pacman -S docker docker-compose && sudo systemctl enable --now docker.service` |
| **openSUSE** | `sudo zypper install docker docker-compose && sudo systemctl enable --now docker` |
| **Alpine** | `doas apk add docker docker-cli-compose && doas rc-update add docker && doas service docker start` |

Verify with `docker compose version` (Compose v2 syntax, no hyphen, is what
this project uses).

### Common commands

```sh
docker compose up -d              # start (uses the existing image)
docker compose up --build -d     # rebuild after changing code or updating
docker compose logs -f app       # follow application logs
docker compose ps                # status
docker compose down              # stop and remove containers (data is kept)
docker compose down -v           # ⚠ also DELETES the database volume
```

## First run

1. Open <http://127.0.0.1:8787> on the panel host (or
   `http://<tailscale-ip>:8787` from another Tailscale device).
2. The setup screen asks for an email and a password (minimum 8 characters).
   This creates the single admin account — there is no public registration.
3. Strongly recommended: open **Settings → Two-factor authentication**, click
   **Set up two-factor**, add the setup key to Google Authenticator (tap **+ →
   Enter a setup key**, account type *time based*), and confirm with a 6-digit
   code. From then on, login requires the code.

## Remote access with Tailscale

Server Deck is meant to be reached over [Tailscale](https://tailscale.com/),
not the public internet.

1. Install Tailscale on the panel host
   (<https://tailscale.com/download/linux> — one-line installers exist for
   every major distro) and run `sudo tailscale up`.
2. Get this machine's Tailscale IP:

   ```sh
   tailscale ip -4        # e.g. 100.101.102.103
   ```

3. Put it in `.env` next to `docker-compose.yml`:

   ```sh
   SERVERDECK_TAILSCALE_IP=100.101.102.103
   ```

4. Apply: `docker compose up -d` (recreates the port binding).
5. From any device on your tailnet (laptop, phone with the Tailscale app):
   `http://100.101.102.103:8787`.

Two layers keep the panel private:

- **Port binding** — the container port is published only on `127.0.0.1` and
  the Tailscale IP. There is intentionally no `0.0.0.0` binding.
- **Application allowlist** — the app returns `403 Forbidden` for requests
  whose source IP is not loopback, Tailscale CGNAT (`100.64.0.0/10`), or a
  private RFC 1918 range. Customize with `SERVERDECK_ALLOW_NETWORKS`.

> **Do not port-forward Server Deck to the internet.** It is a single-user
> tool that executes SSH commands on your infrastructure. Tailscale (or at
> minimum a VPN/reverse proxy with its own auth) is the supported access path.

## Configuration reference

All configuration is via environment variables. With Docker Compose, set them
in `.env` (see `.env.example`); bare-metal installs export them directly.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SERVERDECK_TAILSCALE_IP` | `127.0.0.2` | Host IP to additionally publish port 8787 on. Set to this machine's Tailscale IP. The default is a loopback alias, i.e. effectively localhost-only. |
| `SERVERDECK_KEY_DIR` | `./keys` | Host folder with SSH private keys, mounted read-write at `/keys` in the container. Shared with your host terminal; web uploads land here. Recommended: `$HOME/.serverdeck/keys`. |
| `SERVERDECK_KEY_UPLOAD_DIR` | `/keys` | The single keys directory inside the container (the host folder is bind-mounted here). It is the **only** folder scanned for keys and where uploads land. |
| `PUID` / `PGID` | `1000` / `1000` | Host UID/GID the container owns the keys folder as, so the same files are readable/manageable from your terminal. Set to your `id -u` / `id -g` if not 1000. |
| `SERVERDECK_KEY_PATH_REMAPS` | *(empty)* | Comma-separated `from=to` path prefixes applied when a saved key path does not exist, e.g. `/home/me/.ssh=/keys`. |
| `SERVERDECK_DB_PASSWORD` | `serverdeck` | Password for the bundled PostgreSQL (not reachable from outside the compose network). |
| `SERVERDECK_SECRET` | *(auto-generated key in DB)* | Secret used to encrypt saved SSH passwords. Set it (e.g. `openssl rand -hex 32`) to keep DB dumps un-decryptable on their own. |
| `SERVERDECK_ALLOW_NETWORKS` | loopback + `100.64.0.0/10` + RFC 1918 | Comma-separated CIDRs allowed to reach the panel. Everything else gets 403. |
| `HOST` / `PORT` | `0.0.0.0` / `8787` | Bind address/port of the Node process *inside* the container (or on the host for bare-metal). |
| `DATABASE_URL` | *(set by compose)* | PostgreSQL connection string. When unset, Server Deck stores everything in `data/state.json` instead. |
| `SERVERDECK_DATA_DIR` | `./data` | Folder for `state.json` in JSON-storage mode. |
| `SERVERDECK_PG_POOL_SIZE` | `5` | PostgreSQL connection pool size. |
| `SERVERDECK_DB_CONNECT_ATTEMPTS` | `30` | Startup retries (1/s) while waiting for PostgreSQL. |

## SSH keys

- Put the private keys Server Deck should use in the folder configured by
  `SERVERDECK_KEY_DIR` (default: the repo's `keys/` folder), or point that
  variable at a dedicated folder such as `$HOME/.serverdeck/keys`. This folder
  is shared between your host terminal and the container.
- Keys appear in the **SSH keys** list in SSH Settings. Recognized:
  `id_rsa`, `id_ed25519`, `id_ecdsa`, `*.pem`, `*.key`, `*.ppk`. Public keys,
  `known_hosts`, and `config` are ignored.
- **Selecting keys.** Tap a key in the list to use it for the current server; a
  ✓ marks selected keys and you can pick **several** (SSH tries each in turn
  until one authenticates). Save to apply.
- **Adding keys.** The recommended way is to drop the key file into the shared
  folder from your terminal (or copy it over SFTP). For convenience there's
  also an **Upload key** button in SSH Settings — it sends the private key
  through the browser, so it's gated behind a warning and meant as a fallback
  when you can't reach the host. Uploaded keys are validated, stored `0600`,
  and an extensionless filename gets `.key` appended so it's discoverable.
- **Open folder.** The button next to *Upload key* opens an in-app file browser
  for the keys folder (the same Files manager used for servers, but backed by
  the local folder and locked to it). Browse, upload, download, rename, and
  delete keys there — no SSH/FTP session needed, since the folder is local to
  the panel.
- **Permissions are enforced on the whole folder**: the container sets the
  folder to `0700` and every private key to `0600` on boot and after each
  upload/delete, so a key dropped in with loose modes is fixed automatically.
- **PuTTY `.ppk` keys** are converted to OpenSSH format in-memory per
  connection via `puttygen` (preinstalled in the Docker image; package
  `putty-tools` on Debian/Ubuntu, `putty` on Fedora/Arch).
- The keys folder is mounted **read-write** so uploads and permission
  enforcement work. The container owns it as `PUID:PGID` (default `1000:1000`)
  so the same files stay manageable from your host terminal — set those to your
  `id -u`/`id -g` if your user isn't 1000.
- On **SELinux** systems (Fedora, RHEL) the compose file mounts the key folder
  with the `:z` flag so the container may read it. If you manage mounts
  yourself, remember that flag.
- If you previously saved servers with host-side key paths and later moved to
  Docker, add a remap instead of editing every server:
  `SERVERDECK_KEY_PATH_REMAPS=/home/you/.ssh=/keys`.

## SSH passwords

For servers that only allow password authentication (or where you simply
don't want to install a key), set the **SSH password** field in SSH Settings.

- Works everywhere keys work: panels, terminal, and the SFTP file manager.
  Both plain `password` and `keyboard-interactive` SSH auth are handled. If a
  key *and* a password are set, the key is tried first.
- Passwords are stored **encrypted at rest** (AES-256-GCM). By default the
  encryption key is auto-generated and kept in the database; set
  `SERVERDECK_SECRET` in `.env` (e.g. `openssl rand -hex 32`) to keep the key
  out of the database, so a database dump alone cannot reveal passwords.
  Changing `SERVERDECK_SECRET` later invalidates saved passwords — re-enter
  them once.
- The API never returns the password (not even encrypted); the UI only shows
  whether one is saved. Leave the field empty to keep the saved password, or
  tick *Remove the saved password* to clear it.
- Keys remain the recommended option: a reversible credential for your
  servers is inherently more sensitive than a private key that never leaves
  the panel host.

## Adding servers

Click **+ → New server** in the server rail and fill in host, user, port, and
key in **SSH Settings**. Optional: display name, group (e.g. per location or
client), a ≤3-character bubble label (like `DB1`), tags, and notes. Connections
use `StrictHostKeyChecking=accept-new` — first connection records the host
key, later mismatches fail.

### Hourly monitoring agent (optional)

The Overview metrics work fine via SSH refresh alone, but the agent gives you
automatic hourly reports even when the panel is closed.

On a saved server, open **SSH Settings**, copy the install command, and run it
on that server as root. It looks like:

```sh
curl -fsSL "http://<panel-address>:8787/agent/install.sh" | sudo sh -s -- "http://<panel-address>:8787" "<server-id>" "<agent-token>"
```

What it does (all of it visible in `agent/install.sh`):

- installs a single POSIX script to `/usr/local/bin/serverdeck-agent`
- writes its endpoint + per-server token to `/etc/serverdeck-agent.conf` (0600)
- registers a **systemd timer** (hourly, randomized delay) or a **cron** entry
  when systemd is absent
- each run collects hostname, OS, kernel, uptime, load, CPU/process counts,
  memory, swap, root disk, and failed systemd services, POSTs one small JSON
  report, and exits

The panel host must be reachable *from the managed server* at the endpoint
URL — over your tailnet, that means the server is also on Tailscale.

Uninstall on the server:

```sh
sudo systemctl disable --now serverdeck-agent.timer 2>/dev/null
sudo rm -f /usr/local/bin/serverdeck-agent /etc/serverdeck-agent.conf \
  /etc/systemd/system/serverdeck-agent.{service,timer} /etc/cron.d/serverdeck-agent
```

## Running without Docker

Works on any distro with Node.js ≥ 22.

```sh
# 1. Dependencies
#    Debian/Ubuntu:  sudo apt install nodejs npm openssh-client putty-tools
#    Fedora/RHEL:    sudo dnf install nodejs openssh-clients putty
#    Arch:           sudo pacman -S nodejs npm openssh putty
#    (putty/putty-tools is only needed for .ppk keys.)
#    If your distro ships Node < 22, use https://github.com/nvm-sh/nvm:
#    nvm install 22

# 2. Get the code and install packages
git clone https://github.com/HussainNizamani/serverdeck.git
cd serverdeck
npm ci --omit=dev

# 3. Run (JSON storage in ./data/state.json — no database needed)
HOST=127.0.0.1 PORT=8787 npm start
```

To use PostgreSQL instead of the JSON file, set
`DATABASE_URL=postgres://user:pass@host:5432/dbname` (any Postgres ≥ 13).

To keep it running, a systemd unit (`/etc/systemd/system/serverdeck.service`):

```ini
[Unit]
Description=Server Deck panel
After=network-online.target

[Service]
User=youruser
WorkingDirectory=/opt/serverdeck
Environment=HOST=127.0.0.1
Environment=PORT=8787
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload && sudo systemctl enable --now serverdeck
```

Bare-metal binds to `127.0.0.1` by default. To expose it on your tailnet, set
`HOST=<your-tailscale-ip>` (the application allowlist still applies).

## Backup and restore

**Docker + PostgreSQL:**

```sh
# Backup
docker compose exec -T postgres pg_dump -U serverdeck serverdeck > serverdeck-backup.sql

# Restore (into a fresh volume)
docker compose down -v
docker compose up -d postgres
docker compose exec -T postgres psql -U serverdeck -d serverdeck < serverdeck-backup.sql
docker compose up -d
```

**JSON mode:** copy `data/state.json` while the app is stopped.

The database contains your servers, **agent tokens**, task history, and login
account — treat backups as secrets.

## Updating

```sh
cd serverdeck
git pull
docker compose up --build -d
```

Schema changes are applied automatically at startup (`create table if not
exists` style); your data is kept.

## Resetting a forgotten password

There is deliberately no "forgot password" email flow. With shell access to
the panel host:

```sh
# PostgreSQL mode — deletes the account + sessions, servers stay untouched:
docker compose exec -T postgres psql -U serverdeck -d serverdeck \
  -c "delete from settings where key = 'auth';"

# JSON mode: stop the app, remove the "auth" key from data/state.json, start.
```

Reload the page — the first-run setup screen appears again. Re-enable 2FA
afterwards.

## Security model

- Single admin account; passwords hashed with scrypt; optional TOTP 2FA
  (RFC 6238, implemented with Node's crypto, no third-party auth services).
- Sessions are 30-day `HttpOnly` cookies (hashed server-side); active sessions
  are listed in Settings and individually revocable. Login attempts are
  rate-limited per source IP.
- Every API route and the terminal WebSocket require a session. Agent report
  ingestion authenticates with a per-server random token instead.
- Network access is restricted twice: Docker port bindings (localhost +
  Tailscale IP) and an in-app source-IP allowlist.
- SSH host keys are pinned on first connect (`accept-new`). `.ppk` conversion
  artifacts live in a `0600` temp dir and are removed immediately after the
  key is read into memory.
- The app process runs as the unprivileged `node` user: the entrypoint starts
  as root only to align the keys folder to your host UID/GID, then drops to
  `node` (via `gosu`) before running the app. PostgreSQL has no published port.
- The keys folder is mounted read-write (uploads need it) and locked down to
  `0700`/`0600`. Uploaded keys are validated and never written outside the
  folder; filenames are sanitized against path traversal.

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `403 Forbidden: Server Deck only accepts connections from allowed networks` | Your source IP isn't in the allowlist. Access via localhost/Tailscale, or extend `SERVERDECK_ALLOW_NETWORKS`. |
| `SSH key was not found: …` | The path saved on the server doesn't exist inside the container. Mount the right folder via `SERVERDECK_KEY_DIR` or add `SERVERDECK_KEY_PATH_REMAPS`. |
| Keys missing from the SSH keys list on Fedora/RHEL | SELinux blocked the bind mount. The compose file uses `:z` already — make sure your override/custom mount does too. |
| `PPK keys require puttygen` | Install `putty-tools` (Debian/Ubuntu) or `putty` (Fedora/Arch) — already included in the Docker image. |
| `SSH connection failed: All configured authentication methods failed` | The chosen key isn't authorized on the target (`ssh -i <key> user@host` to verify), or the saved password is wrong. |
| `Saved password cannot be decrypted` | `SERVERDECK_SECRET` was set or changed after the password was saved. Re-enter the password in SSH Settings. |
| Port 8787 already in use | Another service owns it. Change the published port in `docker-compose.yml`, e.g. `127.0.0.1:9000:8787`. |
| `address already in use` for the Tailscale binding | `SERVERDECK_TAILSCALE_IP` is unset/wrong. Set it to the IP from `tailscale ip -4`. |
| Postgres container never becomes healthy | `docker compose logs postgres`. A changed `SERVERDECK_DB_PASSWORD` does not apply to an existing volume — reset with `down -v` (deletes data) or change the password in Postgres manually. |
| Terminal/clipboard quirks on phones | Over plain `http://` browsers restrict some APIs; Server Deck ships fallbacks, so hard-refresh the page after updates. |
| Agent reports never arrive | The managed server must reach the panel endpoint (is it on the tailnet?). Check `systemctl status serverdeck-agent.timer` and `/etc/serverdeck-agent.conf` on the server. |

## Development

```sh
npm install        # includes dev tooling (none beyond node:test today)
npm test           # node --test, no network required
npm start          # JSON-storage mode on 127.0.0.1:8787
```

Layout: `server.js` (HTTP + WebSocket + API), `src/` (auth, ssh, ssh2 client,
tasks, stores, ws), `public/` (no-build frontend), `agent/` (POSIX agent +
installer), `test/` (node:test suites). Frontend terminal assets are served
from `node_modules` at `/vendor/*`.

Pull requests welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache-2.0](LICENSE)
