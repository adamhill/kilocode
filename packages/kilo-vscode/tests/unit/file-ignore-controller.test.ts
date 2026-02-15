import { afterEach, describe, expect, it } from "bun:test"
import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import { FileIgnoreController } from "../../src/services/autocomplete/shims/FileIgnoreController"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true })
    }),
  )
})

async function createTempWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "kilo-ignore-"))
  tempDirs.push(dir)
  return dir
}

describe("FileIgnoreController", () => {
  it("blocks sensitive env files", async () => {
    const workspace = await createTempWorkspace()
    const controller = new FileIgnoreController(workspace)
    await controller.initialize()

    expect(controller.validateAccess(path.join(workspace, ".env"))).toBe(false)
    expect(controller.validateAccess(path.join(workspace, ".env.local"))).toBe(false)
    expect(controller.validateAccess(path.join(workspace, "src", "index.ts"))).toBe(true)
  })

  it("applies .kilocodeignore patterns", async () => {
    const workspace = await createTempWorkspace()
    await fs.writeFile(path.join(workspace, ".kilocodeignore"), "secret/**\n*.snap\n")

    const controller = new FileIgnoreController(workspace)
    await controller.initialize()

    expect(controller.validateAccess("secret/keys.txt")).toBe(false)
    expect(controller.validateAccess(path.join(workspace, "a.snap"))).toBe(false)
    expect(controller.validateAccess(path.join(workspace, "src", "main.ts"))).toBe(true)
    expect(controller.getInstructions()).toContain(".kilocodeignore")
  })

  it("applies .gitignore patterns", async () => {
    const workspace = await createTempWorkspace()
    await fs.writeFile(path.join(workspace, ".gitignore"), "dist/\n")

    const controller = new FileIgnoreController(workspace)
    await controller.initialize()

    expect(controller.validateAccess("dist/output.js")).toBe(false)
    expect(controller.validateAccess("src/output.js")).toBe(true)
  })
})
