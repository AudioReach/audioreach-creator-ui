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

  await expect(page.getByText("QUI React Starter")).toBeVisible()
})
