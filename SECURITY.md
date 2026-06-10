# Security Policy

Server Deck executes SSH commands against your own infrastructure, so we take
security reports seriously.

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x (latest release) | ✅ |
| anything older | ❌ |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, use GitHub's private vulnerability reporting on this repository
(Security tab → "Report a vulnerability"). Include reproduction steps and the
version/commit you tested.

You can expect an acknowledgement within a few days. Once a fix is released,
the report will be credited in the release notes unless you prefer otherwise.

## Deployment expectations

Server Deck's threat model assumes:

- it is reachable only via localhost or a private network (Tailscale) — never
  port-forwarded to the public internet;
- the host it runs on is trusted (whoever controls the host controls the SSH
  keys it can read);
- backups of its database are protected (they contain agent tokens and the
  password hash).

Issues that require violating those assumptions (e.g. "an attacker on the
panel host can read mounted keys") may be closed as working-as-intended, but
report them anyway if unsure.
