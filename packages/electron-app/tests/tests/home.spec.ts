import {type ElectronApplication, expect, test} from "@playwright/test"

import {getTestApp} from "~utils"

let electronApp: ElectronApplication | null

test.beforeAll(async () => {
  electronApp = await getTestApp()
  if (!electronApp) {
    throw new Error("Failed to initialize Electron application for testing")
  }
})

test.afterAll(async () => {
  await electronApp?.close?.()
})

test("Renders Start Page with Projects and Devices buttons", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const projectsButton = page.getByRole("button", {name: "Projects"})
  await expect(projectsButton).toBeVisible()

  const devicesButton = page.getByRole("button", {name: "Devices"})
  await expect(devicesButton).toBeVisible()
})

test("Shows navigation buttons and controls", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const openFileButton = page.getByRole("button", {name: "Open File"})
  await expect(openFileButton).toBeVisible()

  const deviceManagerButton = page.getByRole("button", {name: "Device Manager"})
  await expect(deviceManagerButton).toBeVisible()
})

test("Clicking About menu item shows toast", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  await page.waitForLoadState("networkidle")

  // Get the side nav root element to check its state
  const sideNav = page.locator('[data-scope="side-nav"][data-part="root"]')

  // Verify side nav starts in closed state
  await expect(sideNav).toHaveAttribute("data-state", "closed")

  // Expand the side nav first
  const expandButton = sideNav.locator("button").first()
  await expect(expandButton).toBeVisible()
  await expandButton.click()

  // Wait for and verify the side nav is now open
  await expect(sideNav).toHaveAttribute("data-state", "open", {timeout: 2000})

  // Find and click the About button in the side nav
  const aboutButton = sideNav.getByText("About")
  await expect(aboutButton).toBeVisible()
  await aboutButton.click()

  // Check if toast message appears
  const toast = page.getByText("About AudioReach Creator")
  await expect(toast).toBeVisible({timeout: 3000})
})
