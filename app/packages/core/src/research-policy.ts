export * as ResearchPolicy from "./research-policy"

import { Permission } from "@opencode-ai/schema/permission"

/** Exact command IDs exposed by the research client. Everything else is fail-closed. */
export const COMMAND_IDS = [
  "command.palette.show",
  "session.list",
  "session.new",
  "session.interrupt",
  "session.quick_switch.1",
  "session.quick_switch.2",
  "session.quick_switch.3",
  "session.quick_switch.4",
  "session.quick_switch.5",
  "session.quick_switch.6",
  "session.quick_switch.7",
  "session.quick_switch.8",
  "session.quick_switch.9",
  "session.rename",
  "session.delete",
  "session.compact",
  "session.timeline",
  "session.undo",
  "session.redo",
  "session.first",
  "session.last",
  "session.messages_last_user",
  "session.message.next",
  "session.message.previous",
  "session.page.up",
  "session.page.down",
  "session.line.up",
  "session.line.down",
  "session.half.page.up",
  "session.half.page.down",
  "model.list",
  "model.cycle_recent",
  "model.cycle_recent_reverse",
  "model.cycle_favorite",
  "model.cycle_favorite_reverse",
  "provider.connect",
  "variant.cycle",
  "variant.list",
  "theme.switch",
  "theme.switch_mode",
  "theme.mode.lock",
  "help.show",
  "ocarina.status",
  "terminal.title.toggle",
  "permission.mode",
  "prompt.clear",
  "prompt.submit",
  "prompt.paste",
  "prompt.stash",
  "prompt.stash.pop",
  "prompt.stash.list",
  "prompt.history.previous",
  "prompt.history.next",
  "messages.copy",
  "message.copy",
  "session.copy",
  "app.exit",
] as const

/** Slash commands exposed by the research client. */
export const COMMAND_ROUTES = [
  "new",
  "clear",
  "sessions",
  "model",
  "models",
  "provider",
  "connect",
  "resume",
  "continue",
  "status",
  "help",
  "theme",
  "themes",
  "quit",
  "q",
  "undo",
  "redo",
] as const

const commandIDs = new Set<string>(COMMAND_IDS)
const commandRoutes = new Set<string>(COMMAND_ROUTES)

export function commandOptionAllowed(input: { readonly id?: string; readonly slash?: string }) {
  const slash = input.slash?.replace(/^\/+/, "").trim().toLowerCase()
  if (slash && commandRoutes.has(slash)) return true
  const id = input.id?.trim().toLowerCase()
  return id !== undefined && commandIDs.has(id)
}

/** Server/config commands have no trusted source marker, so reject them all. */
export function serverCommandAllowed() {
  return false
}

export const MUTATION_ACTIONS = [
  "edit",
  "write",
  "patch",
  "apply_patch",
  "bash",
  "shell",
  "terminal",
  "pty",
  "todowrite",
] as const

const READ_ONLY_TOOLS = new Set(["read", "grep", "glob", "webfetch", "websearch", "question"])

export function permissionRules(): Permission.Ruleset {
  return [
    { action: "*", resource: "*", effect: "deny" },
    ...MUTATION_ACTIONS.map((action) => ({ action, resource: "*", effect: "deny" as const })),
    { action: "read", resource: "*", effect: "allow" },
    { action: "grep", resource: "*", effect: "allow" },
    { action: "glob", resource: "*", effect: "allow" },
    { action: "webfetch", resource: "*", effect: "allow" },
    { action: "websearch", resource: "*", effect: "allow" },
    { action: "question", resource: "*", effect: "allow" },
    { action: "plan_enter", resource: "*", effect: "allow" },
    { action: "plan_exit", resource: "*", effect: "allow" },
    { action: "read", resource: "*.env", effect: "ask" },
    { action: "read", resource: "*.env.*", effect: "ask" },
    { action: "read", resource: "*.env.example", effect: "allow" },
  ]
}

export function mutationTool(name: string) {
  const normalized = name.trim().toLowerCase().replaceAll("-", "_")
  return MUTATION_ACTIONS.some((action) => action === normalized)
}

export function readOnlyTool(name: string) {
  return READ_ONLY_TOOLS.has(name.trim().toLowerCase().replaceAll("-", "_"))
}
