import { Prompt, type PromptRef } from "../component/prompt"
import { TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createSignal, onMount } from "solid-js"
import { Logo } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { useTheme } from "../context/theme"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useTerminalDimensions } from "@opentui/solid"
import { useTuiConfig } from "../config"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { BRAND } from "../branding"

let once = false
const placeholder = {
  normal: [BRAND.promptPlaceholder],
  shell: [BRAND.promptPlaceholder],
}

export function Home() {
  const pluginRuntime = usePluginRuntime()
  const sync = useSync()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const { theme } = useTheme()
  const editor = useEditorContext()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const promptMaxWidth = createMemo(() => {
    const configured = tuiConfig.prompt?.max_width
    if (configured === "auto") return Math.max(75, Math.floor(dimensions().width * 0.7))
    return configured ?? 75
  })
  let sent = false

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r) return
    if (route.prompt) {
      r.set(route.prompt)
      once = true
      return
    }
    if (!args.prompt) return
    r.set({ input: args.prompt, parts: [] })
    once = true
  }

  // Wait for sync and model store to be ready before auto-submitting --prompt
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!sync.ready || !local.model.ready) return
    if (!args.prompt) return
    if (r.current.input !== args.prompt) return
    sent = true
    r.submit()
  })

  return (
    <HomeSessionDestinationProvider>
      <box flexGrow={1} flexDirection="column">
        <box
          flexGrow={1}
          minHeight={0}
          justifyContent="center"
          paddingLeft={2}
          paddingRight={2}
        >
          <box width="100%" maxWidth={promptMaxWidth()} alignSelf="center">
            <pluginRuntime.Slot name="home_logo" mode="replace">
              <Logo />
            </pluginRuntime.Slot>
            <text fg={theme.text} attributes={TextAttributes.BOLD} marginTop={1} marginBottom={2}>
              What should we work through?
            </text>
            <box width="100%" flexDirection="row" gap={1} zIndex={1000} flexShrink={0}>
              <text fg={theme.primary} attributes={TextAttributes.BOLD}>
                ›
              </text>
              <box flexGrow={1} minWidth={0}>
                <pluginRuntime.Slot name="home_prompt" mode="replace" ref={bind}>
                  <Prompt
                    ref={bind}
                    right={<pluginRuntime.Slot name="home_prompt_right" />}
                    placeholders={placeholder}
                  />
                </pluginRuntime.Slot>
              </box>
            </box>
          </box>
        </box>
        <Toast />
      </box>
    </HomeSessionDestinationProvider>
  )
}
