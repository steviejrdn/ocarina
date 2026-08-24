import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { BRAND } from "../branding"

export function DialogStatus() {
  const { theme } = useTheme()
  const dialog = useDialog()

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          {BRAND.name} status
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={theme.textMuted}>Research session tools are ready.</text>
    </box>
  )
}
