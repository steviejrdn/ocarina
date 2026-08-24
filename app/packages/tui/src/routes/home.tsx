import { Prompt, type PromptRef } from "../component/prompt"
import { TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createSignal, onMount, Show } from "solid-js"
import { Logo } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { useProject } from "../context/project"
import { useTheme } from "../context/theme"
import { usePluginRuntime } from "../plugin/runtime"
import { useEditorContext } from "../context/editor"
import { useTerminalDimensions } from "@opentui/solid"
import { useTuiConfig } from "../config"
import { HomeSessionDestinationProvider } from "./home/session-destination"
import { BRAND } from "../branding"
import { Locale } from "../util/locale"

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
  const project = useProject()
  const { theme } = useTheme()
  const editor = useEditorContext()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const promptMaxWidth = createMemo(() => {
    const configured = tuiConfig.prompt?.max_width
    if (configured === "auto") return Math.max(75, Math.floor(dimensions().width * 0.7))
    return configured ?? 75
  })
  const showIdentityRail = createMemo(() => dimensions().width >= 100)
  const directoryLabel = createMemo(() => Locale.truncate(project.instance.directory(), 34))
  const hasSessions = createMemo(() => sync.data.session.length > 0)
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
          height={1}
          flexShrink={0}
          paddingLeft={2}
          paddingRight={2}
          flexDirection="row"
          justifyContent="space-between"
        >
          <text fg={theme.text} wrapMode="none">
            <span style={{ fg: theme.primary, bold: true }}>{BRAND.name}</span>
            <span style={{ fg: theme.textMuted }}> · {sync.ready ? "ready" : "loading"}</span>
          </text>
          <Show when={dimensions().width >= 70}>
            <text fg={theme.textMuted} wrapMode="none">
              ctrl+p commands
            </text>
          </Show>
        </box>
        <box flexGrow={1} minHeight={0} flexDirection={showIdentityRail() ? "row" : "column"}>
          <Show
            when={showIdentityRail()}
            fallback={
              <box
                width="100%"
                flexShrink={0}
                height={4}
                paddingLeft={2}
                paddingRight={2}
                flexDirection="row"
                alignItems="center"
                gap={2}
                border={["bottom"]}
                borderColor={theme.borderSubtle}
                aria-label="Ocarina identity"
              >
                <pluginRuntime.Slot name="home_logo" mode="replace">
                  <Logo />
                </pluginRuntime.Slot>
                <text fg={theme.textMuted} attributes={TextAttributes.DIM}>
                  Ocarina terminal
                </text>
              </box>
            }
          >
            <box
              width={46}
              flexShrink={0}
              paddingTop={5}
              paddingLeft={3}
              paddingRight={3}
              paddingBottom={3}
              justifyContent="space-between"
              border={["right"]}
              borderColor={theme.borderSubtle}
              aria-label="Ocarina identity"
            >
              <box alignItems="center">
                <pluginRuntime.Slot name="home_logo" mode="replace">
                  <Logo />
                </pluginRuntime.Slot>
                <text fg={theme.textMuted} marginTop={2} attributes={TextAttributes.DIM}>
                  Ocarina terminal
                </text>
                <text fg={theme.textMuted} wrapMode="none">
                  {directoryLabel()}
                </text>
              </box>
              <box>
                <text fg={theme.text} attributes={TextAttributes.BOLD}>
                  Make the next move.
                </text>
                <text fg={theme.textMuted} wrapMode="word">
                  Start with a question, a file, or a decision.
                </text>
              </box>
            </box>
          </Show>
          <box
            flexGrow={1}
            minHeight={0}
            justifyContent={showIdentityRail() ? "center" : "flex-start"}
            paddingTop={showIdentityRail() ? 0 : 2}
            paddingLeft={showIdentityRail() ? 6 : 2}
            paddingRight={2}
          >
            <box width="100%" maxWidth={promptMaxWidth()} alignSelf="center">
              <text fg={theme.textMuted} marginBottom={2}>
                New session
              </text>
              <text fg={theme.text} marginBottom={2}>
                What should we work through?
              </text>
              <box width="100%" flexDirection="row" gap={1} zIndex={1000} paddingTop={1} flexShrink={0}>
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
              <box flexDirection="row" gap={2} marginTop={3}>
                <text fg={theme.text}>Resume</text>
                <text fg={theme.textMuted}>
                  /sessions
                  <Show when={hasSessions()}> · continue a previous thread</Show>
                </text>
              </box>
            </box>
          </box>
        </box>
        <box width="100%" flexShrink={0}>
          <pluginRuntime.Slot name="home_bottom" />
        </box>
        <Toast />
      </box>
      <pluginRuntime.Slot name="home_footer" mode="single_winner">
        <box
          width="100%"
          flexShrink={0}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
          border={["top"]}
          borderColor={theme.borderSubtle}
        >
          <text fg={theme.textMuted}>/sessions · /status</text>
        </box>
      </pluginRuntime.Slot>
    </HomeSessionDestinationProvider>
  )
}
