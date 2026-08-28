# Ocarina

Ocarina is a fork of [OpenCode](https://github.com/anomalyco/opencode) (open-source AI coding agent) repurposed as a **research-only** terminal shell. The fork lives in `app/`; this repo wraps it with decision docs and a launcher.

## Layout

- `app/` — the OpenCode fork (Bun + TypeScript monorepo; workspaces under `app/packages/*`). Keep internal package names as `opencode` / `@opencode-ai/*`; do not mass-rename.
- `scripts/ocarina` — the launcher.

## Read first

- `app/packages/opencode/AGENTS.md` — code style, Effect rules, module shape, DB, dev-server, and V2 Session Core rules. Applies when editing `app/`.

## Constraints

- Ocarina is research-only: shell/edit/git/patch/worktree tools and the `build`/`plan` agents must be removed/denied (fail closed). Reserved commands (`/data`, `/table`, etc.) must show an explicit "not available" dialog, not no-op.
- Runtime isolation is hard: Ocarina must never read/write `~/.config/opencode`, `~/.local/share/opencode`, `~/.cache/opencode`, `~/.opencode`, or installed OpenCode sessions/plugins. Isolation must be enforced in code, not only in the launcher.
- User-facing copy is "Ocarina" / "Research session"; binary is `ocarina` (see `app/packages/opencode/package.json` `bin`). Keep OpenCode attribution/license.

## Commands

All from within `app/` unless noted (Bun is required; `packageManager` is `bun@1.3.14`):

- Install deps: `bun install` (postinstall runs `fix-node-pty` in `packages/core`).
- Run Ocarina: `./scripts/ocarina` from repo root (or `bun run --cwd app/packages/opencode --conditions=browser src/index.ts`).
- Dev TUI: `bun dev` in `app/packages/opencode` — run in tmux, not foreground (see `app/packages/opencode/AGENTS.md`).
- Tests: `bun test` **from a package dir** (e.g. `app/packages/opencode`). Never from repo/app root — `bunfig.toml` sets `test.root = ./do-not-run-tests-from-root` and root `npm test` exits 1.
- Typecheck: `bun typecheck` from a package dir (uses `tsgo --noEmit`, not `tsc`).

## Runtime isolation

The launcher sets `HOME`, `XDG_*`, `TMPDIR`, and `OCARINA_MODE=1` to an Ocarina runtime dir (default `<repo>/runtime`, overridable via `OCARINA_RUNTIME_DIR` or `--runtime-dir`), and unsets `OPENCODE_*` env vars. Core path defaults live in `app/packages/core/src/global.ts` and `app/packages/opencode/src/config/paths.ts`.

## Git

- This repo's default branch is `main` (a single "Initial commit" wrapping the fork). Any `dev` branch references in package-level docs refer to upstream OpenCode, not this repo.
