import { describe, expect, test } from "bun:test"
import { SavedProjects } from "@opencode-ai/core/saved-projects"

describe("SavedProjects", () => {
  test("lists, saves, and removes saved projects", async () => {
    await SavedProjects.remove("saved-projects-test")
    expect(await SavedProjects.list()).toHaveLength(0)

    await SavedProjects.save({ name: "saved-projects-test", directory: "/tmp/project-a" })
    const listed = await SavedProjects.list()
    expect(listed).toHaveLength(1)
    expect(listed[0]!.name).toBe("saved-projects-test")
    expect(listed[0]!.directory).toBe("/tmp/project-a")

    await SavedProjects.remove("saved-projects-test")
    expect(await SavedProjects.list()).toHaveLength(0)
  })

  test("saving the same name upserts and moves to the front", async () => {
    await SavedProjects.remove("saved-projects-test")
    await SavedProjects.save({ name: "saved-projects-test", directory: "/tmp/a" })
    await SavedProjects.save({ name: "saved-projects-test", directory: "/tmp/b" })

    const listed = await SavedProjects.list()
    expect(listed).toHaveLength(1)
    expect(listed[0]!.directory).toBe("/tmp/b")

    await SavedProjects.remove("saved-projects-test")
  })

  test("resolve finds exact and case-insensitive names", async () => {
    await SavedProjects.remove("saved-projects-test")
    await SavedProjects.save({ name: "saved-projects-test", directory: "/tmp/project-a" })

    expect(await SavedProjects.resolve("saved-projects-test")).toBe("/tmp/project-a")
    expect(await SavedProjects.resolve("SAVED-PROJECTS-TEST")).toBe("/tmp/project-a")
    expect(await SavedProjects.resolve("missing")).toBeUndefined()

    await SavedProjects.remove("saved-projects-test")
  })
})