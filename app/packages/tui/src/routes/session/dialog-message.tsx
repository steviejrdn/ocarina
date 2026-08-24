import { createMemo } from "solid-js"
import { useSync } from "../../context/sync"
import { DialogSelect } from "../../ui/dialog-select"
import { useClipboard } from "../../context/clipboard"

export function DialogMessage(props: {
  messageID: string
  sessionID: string
}) {
  const sync = useSync()
  const message = createMemo(() => sync.data.message[props.sessionID]?.find((x) => x.id === props.messageID))
  const clipboard = useClipboard()

  return (
    <DialogSelect
      title="Message Actions"
      options={[
        {
          title: "Copy",
          value: "message.copy",
          description: "message text to clipboard",
          onSelect: async (dialog) => {
            const msg = message()
            if (!msg) return

            const parts = sync.data.part[msg.id]
            const text = parts.reduce((agg, part) => {
              if (part.type === "text" && !part.synthetic) {
                agg += part.text
              }
              return agg
            }, "")

            await clipboard.write?.(text)
            dialog.clear()
          },
        },
      ]}
    />
  )
}
