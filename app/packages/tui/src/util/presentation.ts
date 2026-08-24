import { BRAND } from "../branding"
import { ocarinaAscii } from "../logo"

const logo = {
  left: ["      ", "      ", "      ", "      "],
  right: ["       ", "OCARINA", "       ", "       "],
}

const reset = "\x1b[0m"
const bold = "\x1b[1m"
const dim = "\x1b[90m"

function wordmark(pad = "") {
  const draw = (line: string, fg: string, shadow: string, bg: string) =>
    [...line]
      .map((char) => {
        if (char === "_") return `${bg} ${reset}`
        if (char === "^") return `${fg}${bg}▀${reset}`
        if (char === "~") return `${shadow}▀${reset}`
        if (char === " ") return " "
        return `${fg}${char}${reset}`
      })
      .join("")

  return logo.left.map((line, index) => {
    const left = draw(line, dim, "\x1b[38;5;235m", "\x1b[48;5;235m")
    const right = draw(logo.right[index] ?? "", reset, "\x1b[38;5;238m", "\x1b[48;5;238m")
    return `${pad}${left} ${right}`
  })
}

export function sessionEpilogue(input: { title: string; sessionID?: string }) {
  const weak = (text: string) => `${dim}${text.padEnd(10, " ")}${reset}`
  const art = (process.stdout.columns ?? 80) >= 42 ? ocarinaAscii.map((line) => `  ${line}`) : wordmark("  ")
  return [
    ...art,
    "",
    `  ${weak(BRAND.session)}${bold}${input.title}${reset}`,
    `  ${weak("Resume")}${bold}${BRAND.command} -s ${input.sessionID}${reset}`,
    "",
  ].join("\n")
}
