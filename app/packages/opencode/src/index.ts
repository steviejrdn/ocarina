import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { OcarinaVersion } from "@opencode-ai/core/installation/version"
import { SavedProjects } from "@opencode-ai/core/saved-projects"

const args = hideBin(process.argv)
const OcarinaVersionString = `Ocarina/${OcarinaVersion}`

const valueOptions = new Set(["--model", "-m", "--session", "-s", "--prompt", "--directory", "-d", "--project", "-p"])
const flagOptions = new Set(["--help", "-h", "--version", "-v", "--continue", "-c", "--fork"])
let expectsValue = false
let positional: string | undefined
let positionalIndex = -1
const invalidArgument = args.some((arg, index) => {
  if (expectsValue) {
    expectsValue = false
    return false
  }
  if (valueOptions.has(arg)) {
    expectsValue = true
    return false
  }
  if (arg === "--") return true
  if (
    arg.startsWith("--model=") ||
    arg.startsWith("--session=") ||
    arg.startsWith("--prompt=") ||
    arg.startsWith("--directory=") ||
    arg.startsWith("--project=") ||
    flagOptions.has(arg)
  )
    return false
  if (arg.startsWith("-")) return true
  if (positional !== undefined) return true
  positional = arg
  positionalIndex = index
  return false
})

try {
  if (invalidArgument) {
    throw new Error("positional project paths are not supported; upstream CLI options are not supported")
  }

  // Resolve a positional argument (a saved project name) to its directory.
  if (positional) {
    const directory = await SavedProjects.resolve(positional)
    if (!directory) {
      throw new Error(`saved project not found: ${positional}`)
    }
    args.splice(positionalIndex, 1, "--directory", directory)
  }

  // Keep the TUI and its worker graph out of fail-closed argument paths.
  const { TuiThreadCommand } = await import("./cli/cmd/tui")
  // Ocarina intentionally has a smaller command surface than the upstream
  // OpenCode executable. Keep this entrypoint explicit so adding an upstream
  // command cannot accidentally make it available here.
  const cli = yargs(args)
    .scriptName("ocarina")
    .usage("$0")
    .help("help", "show help")
    .alias("help", "h")
    .version("version", "show version number", OcarinaVersionString)
    .alias("version", "v")
    .command(TuiThreadCommand)
    .strict()
    .fail((message, error) => {
      if (error) throw error
      throw new Error(message)
    })

  await cli.parse()
} catch (error) {
  process.stderr.write(`ocarina: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
