import * as esbuild from "esbuild"
import {cp, mkdir, rm} from "node:fs/promises"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"

import {startElectron} from "./start-electron"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Utility functions to replace @qui/esbuild helpers
function hasArg(argv: string[], flag: string): boolean {
  return argv.includes(flag)
}

function getArg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag)
  return index !== -1 && index + 1 < argv.length ? argv[index + 1] : undefined
}

// Custom logging plugin to replace @qui/esbuild logPlugin
function createLogPlugin(name: string): esbuild.Plugin {
  return {
    name: `log-plugin-${name}`,
    setup(build) {
      build.onStart(() => {
        console.log(`[${name}] Build started...`)
      })
      build.onEnd((result) => {
        if (result.errors.length > 0) {
          console.error(
            `[${name}] Build failed with ${result.errors.length} error(s)`,
          )
        } else {
          console.log(`[${name}] Build completed successfully`)
          // Log bundle sizes if metafile is available
          if (result.metafile) {
            const outputs = Object.entries(result.metafile.outputs)
            outputs.forEach(([file, info]) => {
              const size = (info.bytes / 1024).toFixed(2)
              console.log(`  ${file}: ${size} KB`)
            })
          }
        }
      })
    },
  }
}

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
    await rm(DIST_DIR, {force: true, recursive: true})
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
  console.log("[build.ts] build 'main' and 'preload'")

  // Configuration for main process
  const mainConfig: esbuild.BuildOptions = {
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
      createLogPlugin("main"),
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
              return
            }
            if (RELOAD_ON_CHANGE) {
              await startElectron(PKG_DIR)
            } else if (!running) {
              await startElectron(PKG_DIR)
              running = true
            }
          })
        },
      },
    ],
    sourcemap: true,
    target: "es2020",
  }

  // Configuration for preload script
  const preloadConfig: esbuild.BuildOptions = {
    bundle: true,
    define: {
      "process.env.BUILD_MODE": JSON.stringify(BUILD_MODE),
    },
    entryPoints: ["./src/preload.ts"],
    external: ["electron"],
    format: "iife",
    outfile: "./dist/preload.cjs",
    platform: "browser",
    plugins: [createLogPlugin("preload")],
    sourcemap: true,
    target: "es2017",
  }

  if (IS_WATCH) {
    // Watch mode - use esbuild context API
    const mainCtx = await esbuild.context(mainConfig)
    const preloadCtx = await esbuild.context(preloadConfig)

    await Promise.all([mainCtx.watch(), preloadCtx.watch()])

    console.log("[build.ts] Watching for changes...")

    // Keep the process alive
    await new Promise(() => {})
  } else {
    // One-time build
    await Promise.all([esbuild.build(mainConfig), esbuild.build(preloadConfig)])
  }
}

void main(process.argv)
