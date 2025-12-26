import {
  ApiRequest,
  type ApiRequestType,
  type ApiResponse,
  type ConfigResult,
  type MruProjectInfo,
} from "@audioreach-creator-ui/api-utils"
import {app, BrowserWindow, ipcMain} from "electron"
import Store from "electron-store"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {join, resolve} from "node:path"
import {setTimeout} from "node:timers/promises"

import {
  getFileModificationDateSync,
  openProjectFile,
  showProjectInExplorer,
} from "./project-file-api"

let win: BrowserWindow
const CONFIG_FILE = "config.json"
const MAX_RECENT_PROJECTS = 20

// #region MRU Store Setup

/** Schema for the electron-store */
interface StoreSchema {
  recentProjects: MruProjectInfo[]
}

/** Initialize electron-store for MRU (Most Recently Used) projects */
const mruStore = new Store<StoreSchema>({
  defaults: {
    recentProjects: [],
  },
  name: "arc-mru",
  // Optional: Add schema validation
  schema: {
    recentProjects: {
      items: {
        properties: {
          description: {type: "string"},
          filepath: {type: "string"},
          id: {type: "string"},
          image: {type: "string"},
          lastModifiedDate: {type: "string"},
          name: {type: "string"},
        },
        required: ["id", "name", "filepath"],
        type: "object",
      },
      type: "array",
    },
  },
})

// #endregion MRU Store Setup

const appUrl = "http://localhost:5173"

const createWindow = async () => {
  const isDev = process.env.DEV

  win = new BrowserWindow({
    height: 800,
    title: "AudioReach™ Creator",
    webPreferences: {
      preload: resolve(__dirname, "./preload.cjs"),
    },
    width: isDev ? 1550 : 1200,
  })

  if (isDev) {
    /**
     * The electron process starts in local dev mode at the same time as the Angular
     * application.  The electron process generally starts quicker, so the Angular
     * app doesn't have enough time to load before the electron process tries to
     * access it. This function checks if the app is available.
     */
    const ora = await import("ora").then((pkg) => pkg.default)
    const spinner = ora("Checking for app ready state").start()

    let attempt = 0
    let appReady = false
    // default behavior = check for 60 seconds.
    while (attempt < 120 && !appReady) {
      attempt += 1
      spinner.text = `Checking for app ready state, attempt ${attempt}`
      const checkIfReady = await setTimeout(500, async () =>
        fetch(appUrl)
          .then((res) => {
            return res.status === 200
          })
          .catch(() => false),
      )
      if (await checkIfReady()) {
        appReady = true
        spinner.succeed(`App detected in local dev mode at ${appUrl}`)
      }
    }

    if (appReady) {
      win
        .loadURL(appUrl)
        .then(() => {
          win.webContents.openDevTools()
        })
        .catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          console.debug(`Error starting application - ${errorMessage}`)
        })
        .catch((err) => {
          console.debug("Critical application error, exiting", err)
          win.close()
          process.exit(0)
        })
    } else {
      spinner.fail(
        `Failed to start application. Please ensure that the React application is running at ${appUrl}`,
      )
      process.exit(0)
    }
  } else {
    await win.loadFile(`${__dirname}/index.html`).catch((err) => {
      console.log("Error starting application", err)
    })
  }
}

void app.whenReady().then(() => {
  void createWindow()
})

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})

// also see: packages/api-utils/api.ts
ipcMain.handle(
  "ipc::message",
  async (_, args: ApiRequestType): Promise<ApiResponse> => {
    let response
    let data = undefined

    switch (args.requestType) {
      case ApiRequest.GetProjectFileModificationDate:
        const filepath = args.data.filepath
        const modifiedDate = getFileModificationDateSync(filepath)

        data = {date: modifiedDate}
        response = ""

        if (modifiedDate === undefined) {
          response = "Unable to get modified date"
        }

        break
      case ApiRequest.OpenProjectFile:
        const openFileResponse = await openProjectFile(win)

        response = openFileResponse.response
        data = openFileResponse.data
        break
      case ApiRequest.ShowProjectFileInExplorer:
        console.debug(`Showing project file in explorer: ${args.data}`)
        showProjectInExplorer(args.data)
        response = ""
        break
      default:
        response = "Unknown request type"
    }

    return {data, message: response, requestType: args.requestType}
  },
)

//  #region Configuration file handling

function getConfigFilePath() {
  return join(__dirname, CONFIG_FILE)
}

function ensureConfigFileExists(): string {
  const filePath = getConfigFilePath()
  try {
    if (!existsSync(filePath)) {
      writeFileSync(filePath, "", "utf8")
      console.log(
        `Configuration file does not exist. A new empty file has been created at ${filePath}`,
      )
    }
  } catch (error) {
    console.log(
      "Failed to create an empty configuration file due to an error:",
      error,
    )
    return ""
  }

  return filePath
}

ipcMain.handle("load-config-data", (): ConfigResult => {
  try {
    const filePath = ensureConfigFileExists()
    if (!filePath) {
      return {
        message:
          "Error occurred while creating or fetching the configuration file",
        status: false,
      }
    }
    const configData = readFileSync(filePath, "utf-8")
    return {
      data: configData,
      message: "success",
      status: true,
    }
  } catch (error: unknown) {
    return {
      message: error instanceof Error ? error.message : String(error),
      status: false,
    }
  }
})

ipcMain.handle(
  "save-config-data",
  (_event, newConfigData: string): ConfigResult => {
    try {
      const filePath = ensureConfigFileExists()
      if (!filePath) {
        return {
          message: "Error occurred while fetching the configuration file",
          status: false,
        }
      }
      writeFileSync(filePath, newConfigData, "utf-8")
      return {
        message: `Successfully saved the configuration file to the path: ${filePath}`,
        status: true,
      }
    } catch (error: unknown) {
      console.error("Unable to save configuration file due to an error:", error)
      return {
        message: error instanceof Error ? error.message : String(error),
        status: false,
      }
    }
  },
)
//  #endregion Configuration file handling

//  #region MRU Store IPC Handlers

/** Get all recent projects from MRU store */
ipcMain.handle("mru:get-recent-projects", (): MruProjectInfo[] => {
  try {
    return mruStore.get("recentProjects", [])
  } catch (error) {
    console.error("Error getting recent projects from MRU store:", error)
    return []
  }
})

/** Add a project to the MRU store */
ipcMain.handle(
  "mru:add-project",
  (_event, project: MruProjectInfo): boolean => {
    try {
      const recentProjects = mruStore.get("recentProjects", [])

      // Check if project already exists (by filepath)
      const existingIndex = recentProjects.findIndex(
        (p) => p.filepath === project.filepath,
      )

      if (existingIndex !== -1) {
        // Update existing project and move to front
        recentProjects.splice(existingIndex, 1)
      }

      // Add to the beginning of the array (most recent)
      recentProjects.unshift(project)

      // Optional: Limit to last 20 projects
      const limitedProjects = recentProjects.slice(0, MAX_RECENT_PROJECTS)

      mruStore.set("recentProjects", limitedProjects)
      return true
    } catch (error) {
      console.error("Error adding project to MRU store:", error)
      return false
    }
  },
)

/** Remove a project from the MRU store by ID */
ipcMain.handle("mru:remove-project", (_event, projectId: string): boolean => {
  try {
    const recentProjects = mruStore.get("recentProjects", [])
    const filteredProjects = recentProjects.filter((p) => p.id !== projectId)
    mruStore.set("recentProjects", filteredProjects)
    return true
  } catch (error) {
    console.error("Error removing project from MRU store:", error)
    return false
  }
})

/** Update a project's image in the MRU store */
ipcMain.handle(
  "mru:update-project-image",
  (_event, projectId: string, image: string): boolean => {
    try {
      const recentProjects = mruStore.get("recentProjects", [])
      const projectIndex = recentProjects.findIndex((p) => p.id === projectId)

      console.debug(
        "[MRU] update-project-image called",
        JSON.stringify({
          foundIndex: projectIndex,
          imageLength: typeof image === "string" ? image.length : 0,
          projectId,
          recentCount: recentProjects.length,
        }),
      )

      if (projectIndex !== -1) {
        recentProjects[projectIndex].image = image
        mruStore.set("recentProjects", recentProjects)
        console.debug(
          "[MRU] Image updated successfully",
          JSON.stringify({
            projectId,
            storePath: mruStore.path,
          }),
        )
        return true
      }

      console.warn(
        "[MRU] Project not found when updating image",
        JSON.stringify({
          projectId,
          storePath: mruStore.path,
        }),
      )
      return false
    } catch (error) {
      console.error("Error updating project image in MRU store:", error)
      return false
    }
  },
)

/** Clear all recent projects from MRU store */
ipcMain.handle("mru:clear-all", (): boolean => {
  try {
    mruStore.set("recentProjects", [])
    return true
  } catch (error) {
    console.error("Error clearing MRU store:", error)
    return false
  }
})

/** Get the path where MRU data is stored (useful for debugging) */
ipcMain.handle("mru:get-store-path", (): string => {
  return mruStore.path
})

//  #endregion MRU Store IPC Handlers
