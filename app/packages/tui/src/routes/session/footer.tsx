import { Match, onCleanup, onMount, Switch } from "solid-js"
import { useTheme } from "../../context/theme"
import { useConnected } from "../../component/use-connected"
import { createStore } from "solid-js/store"

export function Footer() {
  const { theme } = useTheme()
  const connected = useConnected()

  const [store, setStore] = createStore({
    welcome: false,
  })

  onMount(() => {
    // Track all timeouts to ensure proper cleanup
    const timeouts: ReturnType<typeof setTimeout>[] = []

    function tick() {
      if (connected()) return
      if (!store.welcome) {
        setStore("welcome", true)
        timeouts.push(setTimeout(() => tick(), 5000))
        return
      }

      if (store.welcome) {
        setStore("welcome", false)
        timeouts.push(setTimeout(() => tick(), 10_000))
        return
      }
    }
    timeouts.push(setTimeout(() => tick(), 10_000))

    onCleanup(() => {
      timeouts.forEach(clearTimeout)
    })
  })

  return (
    <box flexDirection="row" justifyContent="space-between" gap={1} flexShrink={0}>
      <box gap={2} flexDirection="row" flexShrink={0}>
        <Switch>
          <Match when={store.welcome}>
            <text fg={theme.text}>
              Start Ocarina <span style={{ fg: theme.textMuted }}>/connect</span>
            </text>
          </Match>
          <Match when={connected()}>
            <text fg={theme.textMuted}>/status</text>
          </Match>
        </Switch>
      </box>
    </box>
  )
}
