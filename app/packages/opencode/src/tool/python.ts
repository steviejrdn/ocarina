import path from "path"
import { randomUUID } from "node:crypto"
import { Effect, Schema, Stream } from "effect"
import { ChildProcess } from "effect/unstable/process"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { InstanceState } from "@/effect/instance-state"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Path as GlobalPath } from "@opencode-ai/core/global"
import * as Truncate from "./truncate"
import DESCRIPTION from "./python.txt"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  code: Schema.String.annotate({
    description: "The Python code to execute. Self-contained; print results to stdout.",
  }),
  timeout: Schema.optional(Schema.Number).annotate({
    description: "Maximum runtime in seconds (default 300).",
  }),
})

const MAX_METADATA_LENGTH = 30_000

function preview(text: string) {
  if (text.length <= MAX_METADATA_LENGTH) return text
  return "...\n\n" + text.slice(-MAX_METADATA_LENGTH)
}

const SANDBOX_RUNNER = `import builtins, os, sys

# Capture originals before any mutation so the runner itself still works.
_real_import = builtins.__import__
_real_open = builtins.open
_real_exec = exec
_real_compile = compile

_BLOCKED = {
    "requests", "smtplib", "ftplib", "poplib", "imaplib", "telnetlib",
    "xmlrpc",
}

_DISABLE = {
    "subprocess": ("Popen", "run", "call", "check_call", "check_output", "getoutput", "getstatusoutput"),
    "webbrowser": ("open", "open_new", "open_new_tab", "get"),
    "urllib.request": ("urlopen", "Request", "urlretrieve"),
    "http.client": ("HTTPConnection", "HTTPSConnection"),
    "multiprocessing": ("Process", "Pool", "spawn", "fork", "forkserver", "Pipe", "Queue"),
    "pty": ("fork", "openpty", "spawn"),
}

def _disable(mod, attrs):
    for a in attrs:
        try:
            setattr(mod, a, None)
        except Exception:
            pass

def _restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
    top = name.split(".")[0]
    if top in _BLOCKED:
        raise ImportError(f"import of {name!r} is blocked in the Ocarina python sandbox")
    mod = _real_import(name, globals, locals, fromlist, level)
    target = sys.modules.get(name, mod)
    for modname, attrs in _DISABLE.items():
        if name == modname or name.startswith(modname + "."):
            _disable(target, attrs)
    return mod

builtins.__import__ = _restricted_import

for _name in (
    "system", "popen", "spawnl", "spawnle", "spawnlp", "spawnlpe",
    "spawnv", "spawnve", "spawnvp", "spawnvpe",
    "execl", "execle", "execlp", "execlpe", "execv", "execve",
    "execvp", "execvpe", "fork", "forkpty", "posix_spawn", "posix_spawnp",
):
    setattr(os, _name, None)

_proj = os.path.realpath(os.environ.get("OCARINA_PROJECT_DIR", "."))

def _safe_open(file, *args, **kwargs):
    if isinstance(file, (str, bytes, os.PathLike)):
        raw = os.fsdecode(file)
        resolved = os.path.realpath(raw if os.path.isabs(raw) else os.path.join(os.getcwd(), raw))
        if not (resolved == _proj or resolved.startswith(_proj + os.sep)):
            raise PermissionError(f"file access outside the project is not allowed: {raw}")
    return _real_open(file, *args, **kwargs)

builtins.open = _safe_open

_engine = os.environ.get("OCARINA_ENGINE_PATH")
if _engine:
    sys.path.insert(0, os.path.dirname(_engine.rstrip(os.sep)))

_code_path = os.environ.get("OCARINA_PY_SCRIPT")
if not _code_path or not os.path.isfile(_code_path):
    raise SystemExit("OCARINA_PY_SCRIPT is not set or missing")

with _real_open(_code_path, "r", encoding="utf-8") as _f:
    _src = _f.read()

_ns = {"__name__": "__main__"}
if _engine:
    try:
        from engine import (
            DataProcessor,
            load_csv,
            load_excel,
            load_sav,
            detect_column_types,
            create_crosstab,
            calculate_base,
            calculate_frequencies,
            parse_code_def,
            evaluate_code_def,
            validate_code_def,
            compute_proportion_significance,
            compute_total_significance,
        )
        for _name in (
            "DataProcessor",
            "load_csv",
            "load_excel",
            "load_sav",
            "detect_column_types",
            "create_crosstab",
            "calculate_base",
            "calculate_frequencies",
            "parse_code_def",
            "evaluate_code_def",
            "validate_code_def",
            "compute_proportion_significance",
            "compute_total_significance",
        ):
            _ns[_name] = locals()[_name]
    except Exception:
        pass
_real_exec(_real_compile(_src, "script.py", "exec"), _ns)
`

export const PythonTool = Tool.define(
  "python",
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner
    const fs = yield* FSUtil.Service
    const trunc = yield* Truncate.Service

    const pythonBin = yield* Effect.gen(function* () {
      const explicit = process.env["OCARINA_PYTHON"]
      if (explicit) return explicit
      const venv = path.join(
        GlobalPath.runtime,
        "venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      )
      if (yield* fs.existsSafe(venv)) return venv
      return "python3"
    })

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: { code: string; timeout?: number }, ctx: Tool.Context) =>
        Effect.scoped(
          Effect.gen(function* () {
            yield* ctx.ask({
              permission: "python",
              patterns: ["*"],
              always: ["*"],
              metadata: {
                timeout: params.timeout,
              },
            })

            const timeout = params.timeout !== undefined ? params.timeout * 1000 : 300_000
            if (timeout < 0) {
              throw new Error(`Invalid timeout value: ${params.timeout}. Timeout must be a positive number.`)
            }

            const ins = yield* InstanceState.context

            const dir = path.join(GlobalPath.tmp, `python-${randomUUID()}`)
            const scriptPath = path.join(dir, "script.py")
            const runPath = path.join(dir, "run.py")
            yield* Effect.addFinalizer(
              () =>
                fs.remove(dir, { recursive: true, force: true }).pipe(
                  Effect.orDie,
                  Effect.catch(() => Effect.void),
                ),
            )

            yield* fs.writeWithDirs(scriptPath, params.code)
            yield* fs.writeWithDirs(runPath, SANDBOX_RUNNER)

            const handle = yield* spawner.spawn(
              ChildProcess.make(pythonBin, [runPath], {
                cwd: ins.directory,
                env: {
                  OCARINA_PY_SCRIPT: scriptPath,
                  OCARINA_PROJECT_DIR: ins.directory,
                  OCARINA_ENGINE_PATH: path.join(GlobalPath.runtime, "engine"),
                  PATH: "/usr/local/bin:/usr/bin:/bin",
                  PYTHONDONTWRITEBYTECODE: "1",
                  PYTHONUNBUFFERED: "1",
                  LANG: "C.UTF-8",
                },
                extendEnv: false,
                stdin: "ignore",
                detached: process.platform !== "win32",
              }),
            )

            const limits = yield* trunc.limits()
            let buf = ""
            let cut = false
            yield* Effect.forkScoped(
              Stream.runForEach(Stream.decodeText(handle.all), (chunk) => {
                buf += chunk
                if (Buffer.byteLength(buf, "utf-8") > limits.maxBytes * 2) {
                  cut = true
                  buf = buf.slice(-limits.maxBytes)
                }
                return Effect.void
              }),
            )

            const abort = Effect.callback<void>((resume) => {
              if (ctx.abort.aborted) return resume(Effect.void)
              const handler = () => resume(Effect.void)
              ctx.abort.addEventListener("abort", handler, { once: true })
              return Effect.sync(() => ctx.abort.removeEventListener("abort", handler))
            })

            const timeoutEffect = Effect.sleep(`${timeout + 100} millis`)
            const exit = yield* Effect.raceAll([
              handle.exitCode.pipe(Effect.map((code) => ({ kind: "exit" as const, code }))),
              abort.pipe(Effect.map(() => ({ kind: "abort" as const, code: null }))),
              timeoutEffect.pipe(Effect.map(() => ({ kind: "timeout" as const, code: null }))),
            ])

            let timedOut = false
            let aborted = false
            if (exit.kind === "abort") {
              aborted = true
              yield* handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
            }
            if (exit.kind === "timeout") {
              timedOut = true
              yield* handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
            }

            const result = yield* trunc.output(buf || "(no output)", { direction: "tail" })

            const meta: string[] = []
            if (timedOut) {
              meta.push(
                `python tool terminated after exceeding timeout ${timeout} ms. Increase "timeout" or simplify the computation.`,
              )
            }
            if (aborted) meta.push("User aborted the command")
            if (exit.kind === "exit" && exit.code !== 0) {
              meta.push(`python exited with code ${exit.code}`)
            }

            let output = result.content
            if (meta.length > 0) {
              output += "\n\n<python_metadata>\n" + meta.join("\n") + "\n</python_metadata>"
            }

            return {
              title: "python",
              metadata: {
                output: preview(buf),
                exit: exit.kind === "exit" ? exit.code : null,
                truncated: result.truncated || cut,
                ...(result.truncated ? { outputPath: result.outputPath } : {}),
              },
              output,
            }
          }),
        ).pipe(Effect.orDie),
    }
  }),
)