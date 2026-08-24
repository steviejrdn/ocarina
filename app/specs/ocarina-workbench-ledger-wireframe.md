# Ocarina workbench + session ledger

Static design exploration. This is a terminal-native composition, not a product
implementation or a web layout translated into boxes.

## Recommended desktop state

Target: 110–140 columns, 32+ rows. The transcript owns the largest surface;
context is useful but quiet. `O` is the only persistent Ocarina identity mark.

```text
 O  OCArina  ·  ~/src/atlas                                      branch: main  +2  !1
──────────────────────────────────────────────────────────────────────────────────────────────
  WORKBENCH                                      SESSION LEDGER  /  repair auth redirect
  ┌───────────────────────┐                     09:41  INTENT
  │ project               │                     You asked to keep the callback URL after login.
  │ atlas                 │
  │ ~/src/atlas            │                     09:41  PLAN
  │                       │                     Inspect the callback route, session serializer,
  │ agent                  │                     and the focused redirect tests.
  │ Research               │
  │ model  claude-sonnet  │                     09:42  ACTION  read
  │                       │                     packages/auth/src/redirect.ts
  │ tools                  │                     packages/auth/test/redirect.test.ts
  │  ● read                │
  │  ○ shell               │                     09:42  ACTION  search
  │  ○ write               │                     `returnTo` is dropped when the cookie is renewed.
  │                       │
  │ session                │                     09:43  RESULT
  │ #12  repair auth...    │                     The serializer accepts `returnTo`; the renewal
  │ #11  add login tests   │                     path does not pass it through. Two focused tests
  │ #10  cookie cleanup    │                     cover the first request only.
  └───────────────────────┘                     ───────────────────────────────────────────────
                                                 09:44  ACTION  write  redirect.ts
                                                 Preserving the existing validation boundary.

                                                 09:45  ACTIVE  shell · test redirect
                                                 ▸ bun test packages/auth/test/redirect.test.ts
                                                 running …

  ────────────────────────────────────────────────────────────────────────────────────────────
  [ Research ]  [ claude-sonnet ]  [ auto ]                         esc interrupt    ↑↓ history
  > _                                                                                  ⏎ send
  └──────────────────────────────────────────────────────────────────────────────────────────┘
  Ocarina  ·  /sessions  /model  /status                                      ^K commands  ^Q quit
```

### Named regions

- **Identity line** — one quiet line for Ocarina, project path, branch, and
  compact git state. It is context, not navigation chrome.
- **Workbench rail** — a narrow, stable inventory of project, active agent,
  model, available tools, and recent sessions. It can collapse when width is
  limited; it never competes with the ledger.
- **Session ledger** — the visual center. Entries are chronological and typed:
  `INTENT`, `PLAN`, `ACTION`, `RESULT`, and `ACTIVE`. Each type has a small
  label and spacing rhythm rather than a card or chat bubble.
- **Command surface** — the prompt is the strongest focus target. Its agent,
  model, mode, interrupt affordance, history hint, and submit hint stay on the
  same baseline as the composer.
- **Footer index** — only stable commands and status shortcuts. No decorative
  tagline or duplicated application identity.

## Narrow-terminal adaptation

Target: 60–85 columns. Preserve the ledger and prompt first; turn context into
a one-line status strip and remove the rail rather than squeezing every field.

```text
 O  atlas  ·  main +2 !1                              agent: Research  model: sonnet
────────────────────────────────────────────────────────────────────────────────
 SESSION LEDGER  /  repair auth redirect

 09:41  INTENT
 You asked to keep the callback URL after login.

 09:42  ACTION  search
 returnTo is dropped when the cookie is renewed.

 09:43  RESULT
 The renewal path needs the existing serializer argument.

 09:45  ACTIVE  shell · test redirect
 ▸ bun test packages/auth/test/redirect.test.ts
 running …

────────────────────────────────────────────────────────────────────────────────
 [ Research ]  [ sonnet ]                              esc interrupt  ↑↓ history
 > _                                                                  ⏎ send
────────────────────────────────────────────────────────────────────────────────
 /sessions  /model  /status                              ^K commands  ^Q quit
```

At 59 columns or fewer, hide the identity detail after the project name, omit
the footer command list, and keep the prompt metadata to `[agent] [model]`.
Long ledger lines wrap at the content column; labels remain on the first line.

## State and interaction notes

- **Idle:** the latest result ends with normal breathing room before the prompt.
  The prompt's left rule uses the active blue only while focused.
- **Running:** `ACTIVE` is the only animated/status accent. The command remains
  readable; `esc interrupt` appears at the prompt edge.
- **Tool action:** tools are ledger entries with a terse verb and path/command.
  Detailed output is expandable in place, never a modal by default.
- **Approval required:** the relevant action row receives the warning color and
  the existing permission controls remain keyboard-first.
- **Failure:** the result label turns red and the error stays adjacent to the
  failed action. Do not recolor the whole transcript.
- **Navigation:** ordinary scroll moves through ledger entries; timeline/session
  commands jump by entry. The rail is informational, not a second focus model.
- **Prompt:** `Enter` sends, `Esc` interrupts while running, history remains on
  the existing bindings, and command completion opens from the same surface.
- **Accessibility:** labels use text plus spacing, not color alone. Status
  words (`ACTIVE`, `RESULT`, `FAILED`) remain visible in monochrome terminals.

## Visual principles and palette

- **Calm dark first:** near-black canvas, slightly lifted work surfaces, and
  warm-neutral text. The light counterpart inverts the same relationships.
- **Ledger before chrome:** use vertical rhythm and small uppercase labels for
  hierarchy. Reserve rules for the identity/prompt boundaries and major state
  transitions.
- **One active signal:** blue marks focus and the current active state. Red,
  amber, and green appear only for their semantic status.
- **No chat bubbles:** user intent and agent output share a chronological record;
  indentation and labels distinguish them without pretending this is a messenger.
- **No dashboard density:** the rail is narrow, metadata is terse, and empty
  space separates thought from execution.

| Role     | Dark                              | Light                  | Use                                |
| -------- | --------------------------------- | ---------------------- | ---------------------------------- |
| Canvas   | `#111315`                         | `#f7f7f5`              | Terminal background                |
| Surface  | `#171a1e`                         | `#ffffff`              | Prompt and quiet work surfaces     |
| Rule     | `#333a44`                         | `#d2d5d9`              | Structural separators              |
| Text     | `#e7e9ec`                         | `#15181c`              | Transcript and primary labels      |
| Muted    | `#8f98a3`                         | `#69717b`              | Metadata and hints                 |
| Active   | `#79a8ff`                         | `#2563eb`              | Focus, active tool, current target |
| Semantic | `#ef8f8b` / `#e7b878` / `#8bc99e` | restrained equivalents | Error / warning / success          |
