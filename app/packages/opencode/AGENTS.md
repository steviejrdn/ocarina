# Ocarina code guide

## Database

- **Schema**: Drizzle schema lives in `packages/core/src/**/*.sql.ts`.
- **Migrations**: database migrations live in `packages/core` and are applied by core.

## Development server

- Running `bun dev` from `packages/opencode` starts the live interactive TUI. Do not run it as a blocking foreground command when you need to inspect the result.
- Start it in `tmux` instead: `tmux new-session -d -s opencode-dev 'bun dev'`.
- Capture the current TUI output with: `tmux capture-pane -pt opencode-dev`.
- Stop the session explicitly when done: `tmux kill-session -t opencode-dev`.

## Module shape

Do not use `export namespace Foo { ... }` for module organization. It is not
standard ESM, it prevents tree-shaking, and it breaks Node's native TypeScript
runner. Use flat top-level exports combined with a self-reexport at the bottom
of the file:

```ts
// src/foo/foo.ts
export interface Interface { ... }
export class Service extends Context.Service<Service, Interface>()("@opencode/Foo") {}
export const layer = Layer.effect(Service, ...)
export const defaultLayer = layer.pipe(...)

export * as Foo from "./foo"
```

Consumers import the namespace projection:

```ts
import { Foo } from "@/foo/foo"

yield * Foo.Service
Foo.layer
Foo.defaultLayer
```

Namespace-private helpers stay as non-exported top-level declarations in the
same file — they remain inaccessible to consumers (they are not projected by
`export * as`) but are usable by the file's own code.

### When the file is an `index.ts`

If the module is `foo/index.ts` (single-namespace directory), use `"."` for
the self-reexport source rather than `"./index"`:

```ts
// src/foo/index.ts
export const thing = ...

export * as Foo from "."
```

### Multi-sibling directories

For directories with several independent modules (e.g. `src/session/`,
`src/config/`), keep each sibling as its own file with its own self-reexport,
and do not add a barrel `index.ts`. Consumers import the specific sibling:

```ts
import { SessionRetry } from "@/session/retry"
import { SessionStatus } from "@/session/status"
```

Barrels in multi-sibling directories force every import through the barrel to
evaluate every sibling, which defeats tree-shaking and slows module load.

## Effect rules

Use these rules when writing or migrating Effect code.

See `specs/effect/migration.md` for the compact pattern reference and examples.

### Core

- Use `Effect.gen(function* () { ... })` for composition.
- Use `Effect.fn("Domain.method")` for named/traced effects and `Effect.fnUntraced` for internal helpers.
- `Effect.fn` / `Effect.fnUntraced` accept pipeable operators as extra arguments, so avoid unnecessary outer `.pipe()` wrappers.
- Use `Effect.callback` for callback-based APIs.
- Use `Effect.void` instead of `Effect.succeed(undefined)` or `Effect.succeed(void 0)`.
- Prefer `DateTime.nowAsDate` over `new Date(yield* Clock.currentTimeMillis)` when you need a `Date`.

### Schemas and errors

- Use `Schema.Class` for multi-field data.
- Use branded schemas (`Schema.brand`) for single-value types.
- Use `Schema.TaggedErrorClass` for typed errors.
- Use `Schema.Defect` instead of `unknown` for defect-like causes.
- In `Effect.gen` / `Effect.fn`, prefer `yield* new MyError(...)` over `yield* Effect.fail(new MyError(...))` for direct early-failure branches.

### Runtime vs InstanceState

- Use `makeRuntime` (from `src/effect/run-service.ts`) for all services. It returns `{ runPromise, runFork, runCallback }` backed by a shared `memoMap` that deduplicates layers.
- Use `InstanceState` (from `src/effect/instance-state.ts`) for per-directory or per-project state that needs per-instance cleanup. It uses `ScopedCache` keyed by directory — each open project gets its own state, automatically cleaned up on disposal.
- If two open directories should not share one copy of the service, it needs `InstanceState`.
- Do the work directly in the `InstanceState.make` closure — `ScopedCache` handles run-once semantics. Don't add fibers, `ensure()` callbacks, or `started` flags on top.
- Use `Effect.addFinalizer` or `Effect.acquireRelease` inside the `InstanceState.make` closure for cleanup (subscriptions, process teardown, etc.).
- Use `Effect.forkScoped` inside the closure for background stream consumers — the fiber is interrupted when the instance is disposed.
- To make a service's `init()` non-blocking, fork `InstanceState.get(state)` at the `init()` call site (e.g. `Effect.forkIn(scope)`), not by forking work inside the `InstanceState.make` closure. Forking inside the closure leaves state incomplete for other methods that read it.
- `src/project/bootstrap.ts` already wraps every service `init()` in `Effect.forkDetach`, so `init()` is fire-and-forget in production. Keep `init()` methods synchronous internally; the caller controls concurrency.

### Effect v4 beta API

- `Effect.fork` and `Effect.forkDaemon` do not exist. Use `Effect.forkIn(scope)` to fork a fiber into a specific scope.

### Preferred Effect services

- In effectified services, prefer yielding existing Effect services over dropping down to ad hoc platform APIs.
- Prefer `FileSystem.FileSystem` instead of raw `fs/promises` for effectful file I/O.
- Prefer `ChildProcessSpawner.ChildProcessSpawner` with `ChildProcess.make(...)` instead of custom process wrappers.
- Prefer `HttpClient.HttpClient` instead of raw `fetch`.
- Prefer `Path.Path`, `Config`, `Clock`, and `DateTime` when those concerns are already inside Effect code.
- For background loops or scheduled tasks, use `Effect.repeat` or `Effect.schedule` with `Effect.forkScoped` in the layer definition.

### Effect.cached for deduplication

Use `Effect.cached` when multiple concurrent callers should share a single in-flight computation rather than storing `Fiber | undefined` or `Promise | undefined` manually. See `specs/effect/migration.md` for the full pattern.

### Callback boundaries

Use `EffectBridge` for native or external callbacks (`@parcel/watcher`, `node-pty`, native `fs.watch`, plugin callbacks, etc.) that need to re-enter Effect services with instance/workspace context.

Plain async code should pass explicit context or stay inside an Effect fiber; do not add ambient instance context shims.

## Style guide

### General principles

- Keep things in one function unless composable or reusable.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Avoid `try`/`catch` where possible.
- Avoid using the `any` type.
- Use Bun APIs when possible, like `Bun.file()`.
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity.
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream.
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent"`) when adding a new config module.
- In Effect generators, bind services to named variables before calling methods. Do not use nested service yields such as `yield* (yield* Foo.Service).bar()`.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Imports

- Never alias imports. Do not use `import { foo as bar } from "..."` or renamed imports like `resolve as pathResolve`.
- Never use star imports. Do not use `import * as Foo from "..."` or `import type * as Foo from "..."`.
- If a namespace-style value is needed, import the module's own exported namespace by name, for example `import { Project } from "@opencode-ai/core/project"`, then reference `Project.ID`.
- Prefer dynamic imports for heavy modules that are only needed in selected code paths, especially in startup-sensitive entrypoints. Destructure dynamic import bindings near the top of the narrowest scope that needs them so they read like normal imports. Avoid inline chains such as `await import("./module").then((mod) => mod.value())` or `(await import("./module")).value()`. Keep branch-specific imports inside the branch that needs them to preserve lazy loading.

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Complex logic

When a function has several validation branches or supporting details, make the main function read as the happy path and move supporting details into small helpers below it.

```ts
// Good
export function loadThing(input: unknown) {
  const config = requireConfig(input)
  const metadata = readMetadata(input)
  return createThing({ config, metadata })
}

function requireConfig(input: unknown) {
  ...
}
```

- Keep helpers close to the code they support, below the main export when that improves readability.
- Do not over-abstract simple expressions into many single-use helpers; extract only when it names a real concept like `requireConfig` or `readMetadata`.
- Do not return `Effect` from helpers unless they actually perform effectful work. Synchronous parsing, validation, and option building should stay synchronous.
- Prefer Effect schema helpers such as `Schema.UnknownFromJsonString` and `Schema.decodeUnknownOption` over manual `JSON.parse` wrapped in `Effect.try` when parsing untrusted JSON strings.
- Add comments for non-obvious constraints and surprising behavior, not for obvious assignments or control flow.

### Schema definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible; you shouldn't be using `globalThis.*` at all unless it is the only option.
- Test actual implementation, do not duplicate logic into tests.
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/opencode`.

## Type checking

- Always run `bun typecheck` from package directories (e.g., `packages/opencode`), never `tsc` directly.

## V2 Session Core

- Keep durable prompt admission separate from model execution. `SessionV2.prompt(...)` admits one durable `session_input` row before scheduling advisory `SessionExecution.wake(sessionID)` unless `resume: false` requests admit-only behavior. The serialized runner promotes admitted inputs into visible user messages at safe boundaries.
- Reusing a Session ID adopts the existing Session. Reusing a prompt message ID reconciles an exact retry only when Session, prompt, and delivery mode match; conflicting reuse fails. Historical projected prompts lazily synthesize promoted inbox records during exact retry.
- Keep `SessionExecution` process-global and Session-ID based. Its local implementation owns the process-local Session coordinator and discovers placement through `SessionStore` plus `LocationServiceMap.get(session.location)` only when a drain starts; no layer should take a Session ID. V2 interruption targets the active process-local ownership chain for that Session; idle or missing interruption is a no-op.
- Keep `SessionRunner`, model resolution, tool registry, permissions, and filesystem Location-scoped. Omitted `Location.workspaceID` means implicit-local placement; explicit workspace identity remains reserved for future placement semantics.
- Preserve one explicit `llm.stream(request)` call per provider turn and reload projected history before durable continuation. Do not bridge through legacy `SessionPrompt.loop(...)` or delegate orchestration to an in-memory tool loop.
- Keep local Session drains process-local until clustering is implemented. `SessionRunCoordinator` joins explicit same-Session resumes, coalesces prompt wakeups, and allows different Sessions to run concurrently. Advisory wakes drain eligible durable inbox rows only; post-crash continuation recovery requires a separate explicit design before it may retry provider work. A drain has no durable identity or transcript boundary.
- Keep delivery vocabulary explicit. Prompts steer by default and promote at the next safe provider-turn boundary while the current drain requires continuation. An explicit `queue` input remains pending until the Session would otherwise become idle; promote one queued input at that boundary, then reevaluate continuation before promoting another. Promoting any new user input resets the selected agent's provider-turn allowance; a batch of steers resets it once.
- Keep EventV2 replay owner claims separate from clustered Session execution ownership.
- Keep the System Context algebra, registry, and built-ins in `src/system-context`; keep Context Source producers with their observed domains, and keep Session History selection plus Context Epoch persistence Session-owned.

## Branch names

Use a short branch name of at most three words, separated by hyphens. Do not use slashes or type prefixes such as `feat/` or `fix/`.

Examples: `session-recovery`, `fix-scroll-state`, `regenerate-sdk`.

## Commits and PR titles

Use conventional commit-style messages and PR titles: `type(scope): summary`.

Valid types are `feat`, `fix`, `docs`, `chore`, `refactor`, and `test`. Scopes are optional; use the affected package or area when helpful, e.g., `core`, `opencode`, `tui`, `app`, `desktop`, `sdk`, or `plugin`.

Examples: `fix(tui): simplify thinking toggle styling`, `docs: update contributing guide`, `chore(sdk): regenerate types`.

## Dependency direction

Keep runtime dependencies directed from Schema to Core and Protocol, then from Core and Protocol to Server.
