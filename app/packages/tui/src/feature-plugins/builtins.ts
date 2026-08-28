import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import Notifications from "./system/notifications"

export type BuiltinTuiPlugin = Omit<TuiPluginModule, "id"> & {
  id: string
  tui: TuiPlugin
  enabled?: boolean
}

export function createBuiltinPlugins(options: { experimentalEventSystem: boolean }): BuiltinTuiPlugin[] {
  return [
    Notifications,
  ]
}
