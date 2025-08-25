import {type ElectronApplication, expect, test} from "@playwright/test"

import {getTestApp} from "~utils"

let electronApp: ElectronApplication | null

test.beforeAll(async () => {
  electronApp = await getTestApp()
})

test.afterAll(async () => {
  await electronApp?.close?.()
})

test("Renders the top nav", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const headerTextEl = page.getByTestId("header-text")
  await expect(headerTextEl).toBeVisible()
  await expect(headerTextEl).toHaveText("AudioReach™ Creator")
})

test("Renders the footer", async () => {
  const page = await electronApp?.firstWindow?.()

  if (!page) {
    return test.fail()
  }

  const footerTextEl = page.getByTestId("footer-text")
  await expect(footerTextEl).toBeVisible()
  await expect(footerTextEl).toContainText("Qualcomm")
})
