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

  const startHeading = page.getByRole("heading", { name: "Start Page" })
  await expect(startHeading).toBeVisible()
})

test("Shows 'Open Project' section with OpenFile placeholder", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const openProjectHeading = page.getByRole("heading", { name: "Open Project" })
  await expect(openProjectHeading).toBeVisible()

  const openFilePlaceholder = page.getByText("OpenFile — Placeholder")
  await expect(openFilePlaceholder).toBeVisible()
})

test("Shows 'Recent Projects' section with RecentFiles placeholder", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const recentProjectsHeading = page.getByRole("heading", { name: "Recent Projects" })
  await expect(recentProjectsHeading).toBeVisible()

  const recentFilesPlaceholder = page.getByText("RecentFiles — Placeholder")
  await expect(recentFilesPlaceholder).toBeVisible()
})
