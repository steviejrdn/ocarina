import type { BoxRenderable, TextareaRenderable, ScrollBoxRenderable } from "@opentui/core"
import fuzzysort from "fuzzysort"
import { firstBy } from "remeda"
import { createMemo, createEffect, onMount, onCleanup, Index, Show, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { useSync } from "../../context/sync"
import { getScrollAcceleration } from "../../util/scroll"
import { useTuiConfig } from "../../config"
import { useTheme, selectedForeground } from "../../context/theme"
import { SplitBorder } from "../../ui/border"
import { useTerminalDimensions } from "@opentui/solid"
import type { PromptInfo } from "../../prompt/history"
import { useBindings, useCommandSlashes, useOpencodeModeStack } from "../../keymap"
import { isOcarinaSlashCommand } from "../../prompt/commands"

export type AutocompleteRef = {
  onInput: (value: string) => void
  visible: false | "/"
}

export type AutocompleteOption = {
  display: string
  value?: string
  aliases?: string[]
  description?: string
  onSelect?: () => void
}

export function Autocomplete(props: {
  value: string
  sessionID?: string
  setPrompt: (input: (prompt: PromptInfo) => void) => void
  setExtmark: (partIndex: number, extmarkId: number) => void
  anchor: () => BoxRenderable
  input: () => TextareaRenderable
  ref: (ref: AutocompleteRef) => void
  fileStyleId: number
  agentStyleId: number
  promptPartTypeId: () => number
}) {
  const sync = useSync()
  const slashes = useCommandSlashes()
  const modeStack = useOpencodeModeStack()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const tuiConfig = useTuiConfig()
  const [store, setStore] = createStore({
    index: 0,
    selected: 0,
    visible: false as AutocompleteRef["visible"],
    input: "keyboard" as "keyboard" | "mouse",
  })
  const [positionTick, setPositionTick] = createSignal(0)

  createEffect(() => {
    if (!store.visible) return
    const popMode = modeStack.push("autocomplete")
    onCleanup(popMode)
  })

  createEffect(() => {
    if (!store.visible) return
    let lastPos = { x: 0, y: 0, width: 0 }
    const interval = setInterval(() => {
      const anchor = props.anchor()
      if (anchor.x === lastPos.x && anchor.y === lastPos.y && anchor.width === lastPos.width) return
      lastPos = { x: anchor.x, y: anchor.y, width: anchor.width }
      setPositionTick((tick) => tick + 1)
    }, 50)
    onCleanup(() => clearInterval(interval))
  })

  const position = createMemo(() => {
    if (!store.visible) return { x: 0, y: 0, width: 0 }
    dimensions()
    positionTick()
    const anchor = props.anchor()
    const parent = anchor.parent
    return {
      x: anchor.x - (parent?.x ?? 0),
      y: anchor.y - (parent?.y ?? 0),
      width: anchor.width,
    }
  })

  const filter = createMemo(() => {
    if (!store.visible) return
    props.value
    return props.input().getTextRange(store.index + 1, props.input().cursorOffset)
  })
  const [search, setSearch] = createSignal("")
  createEffect(() => setSearch(filter() ?? ""))
  createEffect(() => {
    filter()
    setStore("input", "keyboard")
  })

  const commands = createMemo((): AutocompleteOption[] => {
    const results: AutocompleteOption[] = slashes().filter((item) => isOcarinaSlashCommand(item.display.slice(1)))
    for (const serverCommand of sync.data.command) {
      if (serverCommand.source === "mcp" || serverCommand.source === "skill") continue
      if (!isOcarinaSlashCommand(serverCommand.name)) continue
      results.push({
        display: "/" + serverCommand.name,
        description: serverCommand.description,
        onSelect: () => {
          const newText = "/" + serverCommand.name + " "
          const cursor = props.input().logicalCursor
          props.input().deleteRange(0, 0, cursor.row, cursor.col)
          props.input().insertText(newText)
          props.input().cursorOffset = Bun.stringWidth(newText)
        },
      })
    }
    results.sort((a, b) => a.display.localeCompare(b.display))
    const max = firstBy(results, [(item) => item.display.length, "desc"])?.display.length
    if (!max) return results
    return results.map((item) => ({ ...item, display: item.display.padEnd(max + 2) }))
  })

  const options = createMemo(() => {
    const searchValue = search()
    const all = commands()
    if (!searchValue) return all
    return fuzzysort
      .go(searchValue, all, {
        keys: [(item) => (item.value ?? item.display).trimEnd(), "description" as const],
        limit: 10,
      })
      .map((result) => result.obj)
  })

  createEffect(() => {
    filter()
    setStore("selected", 0)
  })

  function moveTo(next: number) {
    setStore("selected", next)
    if (!scroll) return
    const viewportHeight = Math.min(height(), options().length)
    const scrollBottom = scroll.scrollTop + viewportHeight
    if (next < scroll.scrollTop) scroll.scrollBy(next - scroll.scrollTop)
    else if (next + 1 > scrollBottom) scroll.scrollBy(next + 1 - scrollBottom)
  }

  function move(direction: -1 | 1) {
    if (!store.visible || !options().length) return
    const next = (store.selected + direction + options().length) % options().length
    moveTo(next)
  }

  function select() {
    const selected = options()[store.selected]
    if (!selected) return
    hide()
    selected.onSelect?.()
  }

  useBindings(() => ({
    target: props.input,
    enabled: () => Boolean(store.visible),
    commands: [
      { name: "prompt.autocomplete.prev", title: "Previous autocomplete item", category: "Autocomplete", run: () => move(-1) },
      { name: "prompt.autocomplete.next", title: "Next autocomplete item", category: "Autocomplete", run: () => move(1) },
      { name: "prompt.autocomplete.hide", title: "Hide autocomplete", category: "Autocomplete", run: hide },
      { name: "prompt.autocomplete.select", title: "Select autocomplete item", category: "Autocomplete", run: select },
      { name: "prompt.autocomplete.complete", title: "Complete autocomplete item", category: "Autocomplete", run: select },
    ],
    bindings: tuiConfig.keybinds.gather("prompt.autocomplete", [
      "prompt.autocomplete.prev",
      "prompt.autocomplete.next",
      "prompt.autocomplete.hide",
      "prompt.autocomplete.select",
      "prompt.autocomplete.complete",
    ]),
  }))

  function show() {
    setStore({ visible: "/", index: props.input().cursorOffset })
  }

  function hide() {
    const text = props.input().plainText
    if (store.visible === "/" && !text.endsWith(" ") && text.startsWith("/")) {
      const cursor = props.input().logicalCursor
      props.input().deleteRange(0, 0, cursor.row, cursor.col)
      props.setPrompt((draft) => {
        draft.input = props.input().plainText
      })
    }
    setStore("visible", false)
  }

  onMount(() => {
    props.ref({
      get visible() {
        return store.visible
      },
      onInput(value) {
        if (store.visible) {
          if (props.input().cursorOffset <= store.index || props.input().getTextRange(store.index, props.input().cursorOffset).match(/\s/))
            hide()
          return
        }
        const offset = props.input().cursorOffset
        if (offset > 0 && value.startsWith("/") && !value.slice(0, offset).match(/\s/)) {
          show()
          setStore("index", 0)
        }
      },
    })
  })

  const height = createMemo(() => {
    const count = options().length || 1
    if (!store.visible) return Math.min(10, count)
    positionTick()
    return Math.min(10, count, Math.max(1, props.anchor().y))
  })
  let scroll: ScrollBoxRenderable
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))

  return (
    <box
      visible={store.visible !== false}
      position="absolute"
      top={position().y - height()}
      left={position().x}
      width={position().width}
      zIndex={100}
      {...SplitBorder}
      borderColor={theme.border}
    >
      <scrollbox
        ref={(renderable: ScrollBoxRenderable) => (scroll = renderable)}
        backgroundColor={theme.backgroundMenu}
        height={height()}
        scrollbarOptions={{ visible: false }}
        scrollAcceleration={scrollAcceleration()}
      >
        <Index
          each={options()}
          fallback={
            <box paddingLeft={1} paddingRight={1}>
              <text fg={theme.textMuted}>No matching items</text>
            </box>
          }
        >
          {(option, index) => (
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={index === store.selected ? theme.primary : undefined}
              flexDirection="row"
              onMouseMove={() => setStore("input", "mouse")}
              onMouseOver={() => {
                if (store.input === "mouse") moveTo(index)
              }}
              onMouseDown={() => {
                setStore("input", "mouse")
                moveTo(index)
              }}
              onMouseUp={select}
            >
              <text fg={index === store.selected ? selectedForeground(theme) : theme.text} flexShrink={0}>
                {option().display}
              </text>
              <Show when={option().description}>
                <text fg={index === store.selected ? selectedForeground(theme) : theme.textMuted} wrapMode="none">
                  {" " + option().description?.trimStart()}
                </text>
              </Show>
            </box>
          )}
        </Index>
      </scrollbox>
    </box>
  )
}
