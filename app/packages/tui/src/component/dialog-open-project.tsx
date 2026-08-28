import { Show, For } from "solid-js"
import path from "path"
import fs from "fs/promises"
import os from "os"
import { useExit } from "../context/exit"
import { useKV } from "../context/kv"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { DialogPrompt } from "../ui/dialog-prompt"
import { useToast } from "../ui/toast"

const RECENT_PROJECTS_KEY = "recent_projects"

function resolveProjectPath(input: string) {
  const home = process.env.OCARINA_REAL_HOME ?? os.homedir()
  const trimmed = input.trim()
  if (trimmed === "~" || trimmed.startsWith("~/")) {
    return path.resolve(home, trimmed === "~" ? "" : trimmed.slice(2))
  }
  return path.resolve(trimmed)
}

async function validateProjectDirectory(directory: string) {
  const stat = await fs.stat(directory).catch(() => undefined)
  return stat?.isDirectory() ?? false
}

function useRecentProjects() {
  const kv = useKV()
  const list = () => kv.get(RECENT_PROJECTS_KEY, []) as string[]
  const save = (directory: string) => {
    const current = list()
    const next = [directory, ...current.filter((item) => item !== directory)].slice(0, 10)
    kv.set(RECENT_PROJECTS_KEY, next)
  }
  return { list, save }
}

function RecentProjectsList(props: { paths: string[]; onOpen: (directory: string) => void }) {
  const { theme } = useTheme()
  return (
    <box gap={1}>
      <Show when={props.paths.length > 0}>
        <text fg={theme.textMuted}>Recent projects</text>
      </Show>
      <For each={props.paths}>
        {(directory) => (
          <text fg={theme.text} wrapMode="none" onMouseUp={() => props.onOpen(directory)}>
            {directory}
          </text>
        )}
      </For>
    </box>
  )
}

export function DialogOpenProject() {
  const dialog = useDialog()
  const exit = useExit()
  const toast = useToast()
  const recent = useRecentProjects()

  async function openDirectory(raw: string) {
    const directory = resolveProjectPath(raw)
    if (!(await validateProjectDirectory(directory))) {
      toast.show({
        variant: "error",
        title: "Invalid project folder",
        message: `Directory does not exist: ${directory}`,
      })
      return
    }
    recent.save(directory)
    exit({ type: "reopen", directory })
  }

  return (
    <DialogPrompt
      title="Open project folder"
      placeholder="~/projects/study"
      description={() => <RecentProjectsList paths={recent.list()} onOpen={openDirectory} />}
      onConfirm={(value) => void openDirectory(value)}
      onCancel={() => dialog.clear()}
    />
  )
}
