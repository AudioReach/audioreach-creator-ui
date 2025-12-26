import {ApiRequest} from "@audioreach-creator-ui/api-utils"

import {
  openProject,
  openWorkspaceProject,
} from "~entities/project/api/projectsApi"
import {getAllUsecases} from "~entities/usecases/api/usecasesApi"
import {mapUsecaseDtoToCategories} from "~entities/usecases/model/usecase.mapper"
import {electronApi} from "~shared/api"
import {logger} from "~shared/lib/logger"
import type ArcProjectInfo from "~shared/types/arc-project-info"

export interface ProjectOpenResponse {
  message?: string
  project?: ArcProjectInfo
  success: boolean
  usecaseData?: any[]
}

/**
 * Service for managing project operations
 * Coordinates API calls, file operations, and project metadata
 */
export class ProjectService {
  /**
   * Fetches usecase data for a project
   * @param projectId - The project ID
   * @returns Promise with usecase data array
   */
  private static async fetchUsecaseData(projectId: string): Promise<any[]> {
    try {
      const result = await getAllUsecases(projectId)
      if (result.success && result.data) {
        logger.info("Successfully fetched usecases for project", {
          action: "fetch_usecases",
          component: "ProjectService",
          projectId,
        })
        return mapUsecaseDtoToCategories(result.data)
      } else {
        logger.error("Failed to fetch usecases", {
          action: "fetch_usecases",
          component: "ProjectService",
          error: result.message,
          projectId,
        })
        return []
      }
    } catch (error) {
      logger.error("Error fetching usecases", {
        action: "fetch_usecases",
        component: "ProjectService",
        error: error instanceof Error ? error.message : String(error),
        projectId,
      })
      return []
    }
  }
  /**
   * Opens a recent project by connecting to backend
   * @param project - The project to open
   * @returns Promise with project open result
   */
  static async openRecentProject(
    project: ArcProjectInfo,
  ): Promise<ProjectOpenResponse> {
    try {
      logger.verbose(`Opening recent project: ${project.name}`, {
        action: "open_recent_project",
        component: "ProjectService",
      })

      // Call backend API to open/connect to the project
      const result = await openProject(project.id)

      if (!result.success) {
        return {
          message: result.message || "Failed to open project",
          success: false,
        }
      }

      // Fetch usecase data for the project
      const usecaseData = await this.fetchUsecaseData(project.id)

      return {
        project,
        success: true,
        usecaseData,
      }
    } catch (error) {
      logger.error("Error opening recent project", {
        action: "open_recent_project",
        component: "ProjectService",
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        message: "Failed to open project",
        success: false,
      }
    }
  }

  /**
   * Opens a workspace project using file picker
   * @returns Promise with project open result
   */
  static async openWorkspaceProjectFromFile(): Promise<ProjectOpenResponse> {
    if (!electronApi) {
      logger.error("Electron API not available", {
        action: "open_workspace_project",
        component: "ProjectService",
      })
      return {
        message: "Electron API not available",
        success: false,
      }
    }

    try {
      // Open a project file using Electron API
      const response = await electronApi.send({
        data: null,
        requestType: ApiRequest.OpenProjectFile,
      })

      // Check if user cancelled the file selection
      if (response.data.cancelled || !response.data.project) {
        logger.verbose("File selection cancelled", {
          action: "open_workspace_project",
          component: "ProjectService",
        })
        return {
          message: "File selection cancelled",
          success: false,
        }
      }

      const projectInfo = response.data.project
      const workspaceFileData = response.data.workspaceFileData
      const acdbFileData = response.data.acdbFileData

      // Validate that we have the required binary data
      if (!workspaceFileData) {
        return {
          message: "Failed to read workspace file data",
          success: false,
        }
      }

      if (!acdbFileData) {
        return {
          message: "No .acdb file found in the project directory",
          success: false,
        }
      }

      // Convert Buffer data to File objects
      const workspaceFileName =
        projectInfo.filepath.split(/[\\/]/).pop() || "workspace.awsp"
      const workspaceFile = new File(
        [new Uint8Array(workspaceFileData)],
        workspaceFileName,
        {type: "application/octet-stream"},
      )

      const acdbFile = new File(
        [new Uint8Array(acdbFileData)],
        "project.acdb",
        {type: "application/octet-stream"},
      )

      // Call the backend API to upload and open the project
      const result = await openWorkspaceProject(
        acdbFile,
        workspaceFile,
        projectInfo.name,
        projectInfo.description,
      )

      if (!result.success || !result.data) {
        return {
          message: result.message || "Failed to open project",
          success: false,
        }
      }

      const desc = result.data.description
        ? result.data.description
        : projectInfo.description
      const name =
        result.data.name !== undefined ? result.data.name : projectInfo.name

      // Create project info for recent projects list
      const project: ArcProjectInfo = {
        description: desc,
        filepath: projectInfo.filepath,
        id: result.data.projectId,
        lastModifiedDate: new Date(),
        name,
      }

      // Fetch usecase data for the project
      const usecaseData = await this.fetchUsecaseData(project.id)

      return {
        project,
        success: true,
        usecaseData,
      }
    } catch (error) {
      logger.error("Error opening workspace project", {
        action: "open_workspace_project",
        component: "ProjectService",
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        message: "Failed to open workspace project",
        success: false,
      }
    }
  }

  /**
   * Shows a project file in the system file explorer
   * @param filepath - The file path to show
   * @returns Promise that resolves when operation completes
   */
  static async showInExplorer(filepath: string): Promise<void> {
    if (!electronApi) {
      logger.error("Electron API not available", {
        action: "show_in_explorer",
        component: "ProjectService",
      })
      throw new Error("Electron API not available")
    }

    try {
      await electronApi.send({
        data: filepath,
        requestType: ApiRequest.ShowProjectFileInExplorer,
      })
    } catch (error) {
      logger.error("Error occurred while trying to open the file explorer", {
        action: "show_in_explorer",
        component: "ProjectService",
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
