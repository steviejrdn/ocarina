export const logo = {
  left: ["      ", "      ", "      ", "      "],
  right: ["       ", "OCARINA", "       ", "       "],
}

// Three-row terminal wordmark supplied as the Ocarina home-state asset.
// Keep the compact fallback in the renderer for narrow terminals.
export const ocarinaAscii = [
  "▄▀▀▄ ▄▀▀▄  ▀▀▄ ▄▀▀▄ █ █▀▀▄  ▀▀▄",
  "█  █ █  ▄ █▀▀█ █    █ █  █ █▀▀█",
  " ▀▀   ▀▀  ▀▀▀▀ ▀    ▀ ▀  ▀ ▀▀▀▀",
] as const

// Compact rail mark (O-C-R-N) for the workbench sidebar.
export const ocarinaMark = [
  "▄▀▀▄ ▄▀▀▄ ▄▀▀▄ █▀▀▄",
  "█  █ █  ▄ █    █  █",
  " ▀▀   ▀▀  ▀    ▀  ▀",
] as const

export const go = {
  left: ["    ", "█▀▀▀", "█_^█", "▀▀▀▀"],
  right: ["    ", "█▀▀█", "█__█", "▀▀▀▀"],
}

export const marks = "_^~,"
