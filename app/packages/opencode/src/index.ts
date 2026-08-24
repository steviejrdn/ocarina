import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { InstallationLocal, InstallationVersion } from "@opencode-ai/core/installation/version"

const args = hideBin(process.argv)
const OcarinaVersion = InstallationLocal ? "Ocarina/local" : `Ocarina/${InstallationVersion}`

const valueOptions = new Set(["--model", "-m", "--session", "-s", "--prompt"])
const flagOptions = new Set(["--help", "-h", "--version", "-v", "--continue", "-c", "--fork"])
let expectsValue = false
const invalidArgument = args.some((arg) => {
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
    flagOptions.has(arg)
  )
    return false
  return true
})

try {
  if (invalidArgument) {
    throw new Error("positional project paths are not supported; upstream CLI options are not supported")
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
    .version("version", "show version number", OcarinaVersion)
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
