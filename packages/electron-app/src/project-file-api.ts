import type {
  ArcWorkspaceFileProperties,
  OpenProjectFileResponseData,
} from "@audioreach-creator-ui/api-utils/src/project-file-api-types"
import {dialog, shell} from "electron"
import {readFileSync, statSync} from "fs"
import {readdir} from "fs/promises"
import {dirname, join} from "path"

export function getFileModificationDateSync(path: string): Date | undefined {
  try {
    const stats = statSync(path)
    return stats.mtime // This is the modification time
  } catch (error) {
    console.error("Error getting file creation date:", error)
  }
  return undefined
}

export function showProjectInExplorer(filepath: string) {
  shell.showItemInFolder(filepath)
}

// #region Open file Test APIs
/** Used for initially testing Open File on dummy project data. */
export async function openProjectFile(
  win: Electron.BaseWindow,
): Promise<{data: OpenProjectFileResponseData; response: string}> {
  let response = ""
  let data: OpenProjectFileResponseData

  try {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      title: "Select a project file *.awsp",
    })

    if (result.canceled) {
      response = "Directory selection cancelled"
      data = {cancelled: true, project: undefined}
    } else {
      const filepath = result.filePaths[0]

      // Read workspace file as binary data
      const workspaceFileData = readFileSync(filepath)

      // Find .acdb file in the same directory
      const dirPath = dirname(filepath)
      let acdbFileData: Buffer | undefined

      try {
        const files = await readdir(dirPath)
        const acdbFiles = files.filter((f) => f.endsWith(".acdb"))

        if (acdbFiles.length > 0) {
          // TODO: Handle multiple .acdb files - currently using the first one
          if (acdbFiles.length > 1) {
            console.warn(
              `Multiple .acdb files found in directory, using first: ${acdbFiles[0]}`,
            )
          }

          const acdbFilePath = join(dirPath, acdbFiles[0])
          acdbFileData = readFileSync(acdbFilePath)
        }
      } catch (error) {
        console.error("Error reading .acdb file:", error)
      }

      response = `File selected: ${filepath}`
      data = {
        acdbFileData,
        cancelled: false,
        project: getProjectFileInfo(filepath),
        workspaceFileData,
      }
      console.log(response)
    }
  } catch (error) {
    console.error("File selection error:", error)
    response = "Failed to open file dialog"
    data = {cancelled: true, project: undefined}
  }

  return {data, response}
}

/** Used for testing open file from file system. Project files are treated as a
 * JSON, parsed into a javascript object and used for display in the UI */
function getProjectFileInfo(filepath: string): ArcWorkspaceFileProperties {
  const fileProps: ArcWorkspaceFileProperties = {
    description: "",
    filepath,
    name: "",
  }

  try {
    // Read the file content
    const fileContent = readFileSync(filepath, "utf8")

    // Parse the JSON content
    const jsonData: ArcWorkspaceFileProperties = JSON.parse(fileContent)

    // Extract name and description properties
    if (jsonData.name) {
      fileProps.name = jsonData.name
    }

    if (jsonData.description) {
      fileProps.description = jsonData.description
    }
  } catch (error) {
    console.error("Error reading project file:", error)
  }

  return fileProps
}
// #endregion
