import { For, Show } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "../context/theme"
import { ocarinaAscii } from "../logo"

export function Logo() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const wideEnough = () => dimensions().width >= 42

  return (
    <box alignItems="flex-start" aria-label="Ocarina">
      <Show
        when={wideEnough()}
        fallback={
          <text fg={theme.text} selectable={false}>
            OCARINA
          </text>
        }
      >
        <For each={ocarinaAscii}>
          {(line) => (
            <text fg={theme.text} selectable={false} wrapMode="none">
              {line}
            </text>
          )}
        </For>
      </Show>
    </box>
  )
}
