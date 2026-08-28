import { cmd } from "@/cli/cmd/cmd"
import { Rpc } from "@/util/rpc"
import { type rpc } from "../tui/worker"
import path from "path"
import { fileURLToPath } from "url"
import { UI } from "@/cli/ui"
import { errorMessage } from "@opencode-ai/tui/util/error"
import { withTimeout } from "@/util/timeout"
import { Filesystem } from "@/util/filesystem"
import type { GlobalEvent } from "@opencode-ai/sdk/v2"
import type { EventSource } from "@opencode-ai/tui/context/sdk"
import { writeHeapSnapshot } from "v8"
import { validateSession } from "../tui/validate-session"
import { win32InstallCtrlCGuard } from "@opencode-ai/tui/terminal-win32"

declare global {
  const OPENCODE_WORKER_PATH: string
}

type RpcClient = ReturnType<typeof Rpc.client<typeof rpc>>

function createWorkerFetch(client: RpcClient): typeof fetch {
  const fn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    const body = request.body ? await request.text() : undefined
    const result = await client.call("fetch", {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    })
    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    })
  }
  return fn as typeof fetch
}

function createEventSource(client: RpcClient): EventSource {
  return {
    subscribe: async (handler) => {
      return client.on<GlobalEvent>("global.event", (e) => {
        handler(e)
      })
    },
  }
}

async function target() {
  if (typeof OPENCODE_WORKER_PATH !== "undefined") return OPENCODE_WORKER_PATH
  const dist = new URL("./cli/tui/worker.js", import.meta.url)
  if (await Filesystem.exists(fileURLToPath(dist))) return dist
  return new URL("../tui/worker.ts", import.meta.url)
}

async function input(value?: string) {
  const piped = process.stdin.isTTY ? undefined : await Bun.stdin.text()
  if (!value) return piped
  if (!piped) return value
  return piped + "\n" + value
}

export function resolveThreadDirectory(
  project?: string,
  envPWD = process.env.OCARINA_PROJECT_DIR ?? process.env.PWD ?? process.env.HOME,
  cwd = process.cwd(),
) {
  const root = Filesystem.resolve(envPWD ?? cwd)
  if (project) return Filesystem.resolve(path.isAbsolute(project) ? project : path.join(root, project))
  return Filesystem.resolve(envPWD ?? cwd)
}

export const TuiThreadCommand = cmd({
  command: "$0",
  describe: "start Ocarina TUI",
  builder: (yargs) =>
    yargs
      .option("model", {
        type: "string",
        alias: ["m"],
        describe: "model to use in the format of provider/model",
      })
      .option("continue", {
        alias: ["c"],
        describe: "continue the last session",
        type: "boolean",
      })
      .option("session", {
        alias: ["s"],
        type: "string",
        describe: "session id to continue",
      })
      .option("prompt", {
        type: "string",
        describe: "prompt to use",
      })
      .option("directory", {
        alias: ["d"],
        type: "string",
        describe: "project folder to open",
      }),
  handler: async (args) => {
    const unguard = win32InstallCtrlCGuard()
    try {
      const { TuiConfig } = await import("@/config/tui")

      const file = await target()
      const prompt = await input(args.prompt)

      const [{ Effect }, { run }, { createLegacyTuiPluginHost }] = await Promise.all([
        import("effect"),
        import("../tui/layer"),
        import("@/plugin/tui/runtime"),
      ])

      let directory = resolveThreadDirectory(args.directory)
      let first = true

      while (true) {
        try {
          process.chdir(directory)
        } catch {
          UI.error("Failed to change directory to " + directory)
          process.exitCode = 1
          return
        }
        const cwd = Filesystem.resolve(process.cwd())
        const config = await TuiConfig.get()

        const worker = new Worker(file, {
          env: Object.fromEntries(
            Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
          ),
        })
        const client = Rpc.client<typeof rpc>(worker)
        const reload = () => {
          client.call("reload", undefined).catch(() => {})
        }
        process.on("SIGUSR2", reload)

        let stopped = false
        const stop = async () => {
          if (stopped) return
          stopped = true
          process.off("SIGUSR2", reload)
          await withTimeout(client.call("shutdown", undefined), 5000).catch(() => {})
          worker.terminate()
        }

        const transport = {
          url: "http://opencode.internal",
          fetch: createWorkerFetch(client),
          events: createEventSource(client),
          headers: undefined,
        }

        if (first) {
          try {
            await validateSession({
              url: transport.url,
              sessionID: args.session,
              directory: cwd,
              fetch: transport.fetch,
              headers: transport.headers,
            })
          } catch (error) {
            UI.error(errorMessage(error))
            process.exitCode = 1
            return
          }
        }

        const result = (await Effect.runPromise(
          run({
            url: transport.url,
            async onSnapshot() {
              const tui = writeHeapSnapshot("tui.heapsnapshot")
              const server = await client.call("snapshot", undefined)
              return [tui, server]
            },
            config,
            pluginHost: createLegacyTuiPluginHost(),
            directory: cwd,
            fetch: transport.fetch,
            headers: transport.headers,
            events: transport.events,
            args: {
              continue: first ? args.continue : undefined,
              sessionID: first ? args.session : undefined,
              model: args.model,
              prompt: first ? prompt : undefined,
            },
          }),
        ).finally(async () => {
          await stop()
        })) as unknown as { epilogue?: string; reason?: unknown }

        if (
          result.reason &&
          typeof result.reason === "object" &&
          (result.reason as { type?: string }).type === "reopen"
        ) {
          directory = (result.reason as { directory: string }).directory
          first = false
          continue
        }

        break
      }
    } finally {
      try {
        unguard?.()
      } catch {}
    }
    process.exit(0)
  },
})
// scratch
