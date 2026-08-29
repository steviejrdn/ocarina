import { createResource, createMemo, createSignal } from "solid-js"
import path from "path"
import fs from "fs/promises"
import os from "os"
import { useExit } from "../context/exit"
import { useKV } from "../context/kv"
import { useTheme } from "../context/theme"
import { useDialog } from "../ui/dialog"
import { DialogSelect, type DialogSelectOption } from "../ui/dialog-select"
import { DialogPrompt } from "../ui/dialog-prompt"
import { useToast } from "../ui/toast"
import { SavedProjects } from "@opencode-ai/core/saved-projects"

const RECENT_PROJECTS_KEY = "recent_projects"

type OpenValue = { type: "saved"; name: string; directory: string } | { type: "recent"; directory: string } | { type: "path"; directory: string } | { type: "save" }

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

export function DialogOpenProject() {
  const dialog = useDialog()
  const exit = useExit()
  const toast = useToast()
  const { theme } = useTheme()
  const recent = useRecentProjects()
  const [filter, setFilter] = createSignal("")
  const [saved] = createResource(() => SavedProjects.list())

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

  async function saveCurrentProject() {
    const name = await DialogPrompt.show(dialog, "Save current project", {
      placeholder: "project name",
      description: () => <text fg={theme.textMuted}>{process.cwd()}</text>,
    })
    if (!name) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.show({ title: "Invalid project name", message: "Project name cannot be empty", variant: "error" })
      return
    }
    await SavedProjects.save({ name: trimmed, directory: process.cwd() })
    toast.show({
      title: `Saved project ${trimmed}`,
      message: process.cwd(),
      variant: "success",
    })
    dialog.replace(() => <DialogOpenProject />)
  }

  const options = createMemo<DialogSelectOption<OpenValue>[]>(() => {
    const query = filter().trim()
    const savedList = saved() ?? []
    const savedDirectories = new Set(savedList.map((item) => item.directory))
    const recentList = recent.list().filter((directory) => !savedDirectories.has(directory))
    const pathOption: DialogSelectOption<OpenValue>[] = query
      ? [{ title: `Open path: ${query}`, value: { type: "path", directory: query } }]
      : []
    return [
      ...pathOption,
      ...savedList.map(
        (item): DialogSelectOption<OpenValue> => ({
          title: item.name,
          description: item.directory,
          value: { type: "saved", name: item.name, directory: item.directory },
          category: "Saved projects",
        }),
      ),
      ...recentList.map(
        (directory): DialogSelectOption<OpenValue> => ({
          title: directory,
          value: { type: "recent", directory },
          category: "Recent projects",
        }),
      ),
      { title: "Save current project", value: { type: "save" } },
    ]
  })

  return (
    <DialogSelect
      title="Open project folder"
      placeholder="Type a path or select a project"
      options={options()}
      skipFilter={true}
      onFilter={(value) => setFilter(value)}
      onSelect={(option) => {
        const value = option.value
        if (value.type === "save") {
          void saveCurrentProject()
          return
        }
        if (value.type === "path") {
          const match = saved()?.find((item) => item.name === value.directory)
          void openDirectory(match ? match.directory : value.directory)
          return
        }
        void openDirectory(value.directory)
      }}
    />
  )
}
