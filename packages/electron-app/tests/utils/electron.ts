import {_electron as electron} from "@playwright/test"

// TODO: https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci
export async function getTestApp() {
  return electron.launch({
    args: ["main.cjs"],
    bypassCSP: true,
    cwd: "dist",
  })
}
