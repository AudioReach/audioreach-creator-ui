import {type ElectronApplication, expect, test} from "@playwright/test"

import {getTestApp} from "~utils"

let electronApp: ElectronApplication | null

test.beforeAll(async () => {
  electronApp = await getTestApp()
})

test.afterAll(async () => {
  await electronApp?.close?.()
})

test("Renders Start Page heading", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const startHeading = page.getByRole("heading", { name: "Workspaces & Devices" })
  await expect(startHeading).toBeVisible()
  
  const workspacesToggleButton = page.getByRole("button", { name: "Workspaces" })
  await expect(workspacesToggleButton).toBeVisible()
})

test("Shows 'Recent Workspaces' section", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const openProjectHeading = page.getByRole("heading", { name: "Recent Workspaces" })
  await expect(openProjectHeading).toBeVisible()
})
