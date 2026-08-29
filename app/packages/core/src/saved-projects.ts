export * as SavedProjects from "./saved-projects"

import path from "path"
import { randomUUID } from "crypto"
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises"
import { Flock } from "./util/flock"
import { Path } from "./global"

export interface SavedProject {
  readonly name: string
  readonly directory: string
  readonly time: number
}

function file() {
  return path.join(Path.state, "saved-projects.json")
}

function lock() {
  return `saved-projects:${file()}`
}

function isSavedProject(value: unknown): value is SavedProject {
  if (typeof value !== "object" || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.name === "string" && typeof record.directory === "string" && typeof record.time === "number"
}

async function read(): Promise<SavedProject[]> {
  try {
    const raw = await readFile(file(), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedProject)
  } catch {
    return []
  }
}

async function write(value: SavedProject[]) {
  await mkdir(path.dirname(file()), { recursive: true })
  const temporary = `${file()}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(value, null, 2))
  try {
    await rename(temporary, file())
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  }
}

export function list(): Promise<SavedProject[]> {
  return read()
}

export async function save(input: { name: string; directory: string }) {
  const name = input.name.trim()
  if (!name) throw new Error("Project name is required")
  await Flock.withLock(lock(), async () => {
    const current = await read()
    const next = [{ name, directory: input.directory, time: Date.now() }, ...current.filter((item) => item.name !== name)]
    await write(next)
  })
}

export async function remove(name: string) {
  await Flock.withLock(lock(), async () => {
    const current = await read()
    await write(current.filter((item) => item.name !== name))
  })
}

export async function resolve(name: string) {
  const current = await read()
  const match =
    current.find((item) => item.name === name) ?? current.find((item) => item.name.toLowerCase() === name.toLowerCase())
  return match?.directory
}