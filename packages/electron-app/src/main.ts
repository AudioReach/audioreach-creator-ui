import {
  ApiRequest,
  type ApiRequestType,
  type ApiResponse,
  camelCaseInput,
  type ConfigResult,
} from "@audioreach-creator-ui/api-utils"
import {app, BrowserWindow, dialog, ipcMain} from "electron"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {readdir, readFile} from "node:fs/promises"
import {join, resolve} from "node:path"
import {setTimeout} from "node:timers/promises"

import {
  getFileModificationDateSync,
  openProjectFile,
  showProjectInExplorer,
} from "./project-file-api"

let win: BrowserWindow
const CONFIG_FILE = "config.json"

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
      case ApiRequest.Request1:
        response = `You sent: ${JSON.stringify(args.data.someObj)}`
        break
      case ApiRequest.Request2:
        response = `You sent: ${JSON.stringify(args.data.someOtherObj)}`
        break
      case ApiRequest.CamelCase:
        response = `Camel cased: ${camelCaseInput(args.data.input)}`
        break
      case ApiRequest.SelectDirectory:
        try {
          const result = await dialog.showOpenDialog(win, {
            properties: ["openDirectory"],
            title: "Select Module XMLs Directory",
          })

          if (result.canceled) {
            response = "Directory selection cancelled"
            data = {cancelled: true, directoryPath: null}
          } else {
            const directoryPath = result.filePaths[0]
            console.log(`Directory selected: ${directoryPath}`)
            response = `Directory selected: ${directoryPath}`
            data = {cancelled: false, directoryPath}
          }
        } catch (error) {
          console.error("Directory selection error:", error)
          response = "Failed to open directory dialog"
          data = {cancelled: true, directoryPath: null}
        }
        break
      case ApiRequest.LoadXmlsFromDirectory:
        try {
          const {directoryPath} = args.data
          console.log(`Loading XMLs from: ${directoryPath}`)

          const files = await readdir(directoryPath)
          const xmlFiles = files.filter((file) =>
            file.toLowerCase().endsWith(".xml"),
          )

          if (xmlFiles.length === 0) {
            response = "No XML files found in directory"
            data = {
              error: "No XML files found",
              moduleCount: 0,
              success: false,
              xmlFiles: [],
            }
          } else {
            // Read and validate XML files
            const xmlContents: {content: string; filename: string}[] = []

            for (const xmlFile of xmlFiles) {
              try {
                const filePath = join(directoryPath, xmlFile)
                const content = await readFile(filePath, "utf-8")
                xmlContents.push({content, filename: xmlFile})
              } catch (error) {
                console.error(`Failed to read ${xmlFile}:`, error)
              }
            }

            console.log(`Successfully loaded ${xmlContents.length} XML files`)
            response = `Loaded ${xmlContents.length} XML files`
            data = {
              moduleCount: xmlContents.length,
              success: true,
              xmlContents,
              xmlFiles: xmlContents.map((x) => x.filename),
            }
          }
        } catch (error) {
          console.error("XML loading error:", error)
          response = `Failed to load XML files: ${error instanceof Error ? error.message : "Unknown error"}`
          data = {
            error: error instanceof Error ? error.message : "Unknown error",
            moduleCount: 0,
            success: false,
            xmlFiles: [],
          }
        }
        break
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
        console.log(`opening file in explorer ${args.data}`)
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
        "Configuration file does not exist. A new empty file has been created at ${filePath}",
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
        message:
          "Successfully saved the configuration file to the path: ${filePath}",
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
