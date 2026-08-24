import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import HomeFooter from "./home/footer"
import Notifications from "./system/notifications"

export type BuiltinTuiPlugin = Omit<TuiPluginModule, "id"> & {
  id: string
  tui: TuiPlugin
  enabled?: boolean
}

export function createBuiltinPlugins(options: { experimentalEventSystem: boolean }): BuiltinTuiPlugin[] {
  return [
    HomeFooter,
    Notifications,
  ]
}
