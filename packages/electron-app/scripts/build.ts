import {cp, mkdir, rm} from "node:fs/promises"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"

import {buildOrWatch, getArg, hasArg, logPlugin} from "@qui/esbuild"

import {startElectron} from "./start-electron"

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main(argv: string[]) {
  const IS_WATCH = hasArg(argv, "--watch")
  const BUILD_MODE = getArg(argv, "--mode") || "development"
  const PKG_DIR = resolve(__dirname, "../")
  const DIST_DIR = resolve(PKG_DIR, "dist")
  const PUBLIC_DIR = resolve(PKG_DIR, "public")
  const RENDER_DIR = resolve(PKG_DIR, "../react-app")
  const RELOAD_ON_CHANGE = hasArg(argv, "--reload-app-on-change") || false

  // Clear the dist folder
  console.log("[build.ts] clear dist dir")
  try {
    await rm(DIST_DIR, {recursive: true})
    await mkdir(DIST_DIR, {recursive: true})
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log("[build.ts] clear dist error", {errorMessage})
  }

  // Copy Web static resources
  if (BUILD_MODE === "production" || BUILD_MODE === "prerelease") {
    // Copy Web static resources
    console.log("[build.ts] copy web static dist")
    await cp(resolve(RENDER_DIR, "dist"), resolve(DIST_DIR), {
      recursive: true,
    })
  }

  // Copy Public files
  console.log("[build.ts] copy public files")
  await cp(PUBLIC_DIR, DIST_DIR, {recursive: true})

  let running = false

  // Build main and preload
  console.log("[build.ts] build 'main' and 'payload'")
  await Promise.all([
    buildOrWatch(
      {
        bundle: true,
        define: {
          "process.env.BUILD_MODE": JSON.stringify(BUILD_MODE),
        },
        entryPoints: ["./src/main.ts"],
        external: ["electron"],
        format: "cjs",
        loader: {
          ".node": "copy",
        },
        metafile: true,
        outfile: "./dist/main.cjs",
        platform: "node",
        plugins: [
          logPlugin({bundleSizeOptions: {logMode: "both"}}),
          {
            name: "start-electron-plugin",
            setup(build) {
              if (!IS_WATCH) {
                return
              }
              build.onEnd(async (result) => {
                if (result.errors.length) {
                  console.log(
                    "[build.ts] build errors detected, skipping electron restart",
                  )
                }
                if (RELOAD_ON_CHANGE) {
                  await startElectron(PKG_DIR)
                } else if (!running) {
                  await startElectron(PKG_DIR)
                  running = true
                }
                running = true
              })
            },
          },
        ],
        sourcemap: true,
        target: "es2020",
      },
      IS_WATCH,
    ),
    buildOrWatch(
      {
        bundle: true,
        define: {
          "process.env.BUILD_MODE": JSON.stringify(BUILD_MODE),
        },
        entryPoints: ["./src/preload.ts"],
        external: ["electron"],
        format: "iife",
        outfile: "./dist/preload.cjs",
        platform: "browser",
        sourcemap: true,
        target: "es2017",
      },
      IS_WATCH,
    ),
  ])
}

void main(process.argv)
