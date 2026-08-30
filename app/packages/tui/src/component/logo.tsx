import { For, Show } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { ocarinaAscii } from "../logo"
import { OcarinaVersion } from "@opencode-ai/core/installation/version"

export function Logo() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const wideEnough = () => dimensions().width >= 42

  return (
    <box alignItems="flex-start" aria-label="Ocarina">
      <box flexDirection="row" gap={2} alignItems="flex-end">
        <Show
          when={wideEnough()}
          fallback={
            <text fg={theme.text} selectable={false}>
              OCARINA
            </text>
          }
        >
          <box>
            <For each={ocarinaAscii}>
              {(line) => (
                <text fg={theme.text} selectable={false} wrapMode="none">
                  {line}
                </text>
              )}
            </For>
          </box>
        </Show>
        <text fg={theme.textMuted} selectable={false}>
          v{OcarinaVersion}
        </text>
      </box>
    </box>
  )
}
