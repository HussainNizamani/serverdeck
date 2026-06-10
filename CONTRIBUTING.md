# Contributing to Server Deck

Thanks for your interest! Server Deck aims to stay **small, dependency-light,
and auditable**. Contributions that follow that spirit are very welcome.

## Ground rules

- **Few dependencies.** New runtime dependencies need a strong justification.
  Prefer Node's standard library; the frontend has no build step — plain HTML,
  CSS, and JavaScript only.
- **Security first.** Anything touching auth, SSH, or the network allowlist
  gets extra scrutiny. Never weaken defaults (no `0.0.0.0` binds, no auth
  bypasses, no command injection via template strings — use the existing
  quoting helpers).
- **Keep it portable.** Backend code targets Node ≥ 22 on Linux; the agent
  must remain POSIX `sh` (no bashisms).

## Developing

```sh
git clone https://github.com/HussainNizamani/serverdeck.git
cd serverdeck
npm install
npm test          # node --test — fast, no network needed
npm start         # runs with JSON storage on 127.0.0.1:8787
```

For the full stack (PostgreSQL): `docker compose up --build -d`.

## Pull requests

1. Fork, create a topic branch.
2. Make the change, add or update tests in `test/` when behavior changes.
3. `npm test` must pass and `node --check` must be clean on changed JS files.
4. Keep PRs focused — one logical change per PR.
5. Describe *why*, not only *what*, in the PR description.

## Reporting bugs / requesting features

Use the GitHub issue templates. For anything security-sensitive, **do not open
a public issue** — see [SECURITY.md](SECURITY.md).
