import type {Project} from "~entities/project"

import {handleApiResult, processApiResponse} from "./utils"

export class BackendApiService {
  private baseUrl = "http://localhost:3500/arcapi/v1"
  private isBackendAvailable = true
  private isRegistered = false
  private maxRetries = 5
  private retryDelay = 2000 // 2 seconds

  // Close a project
  async closeProject(projectId: string): Promise<boolean> {
    const isRegistered = await this.ensureRegistered()
    if (!isRegistered) {
      console.warn(
        `[BackendAPI] Cannot close project ${projectId}: Backend unavailable`,
      )
      return false
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/projects/${projectId}/close`,
        {
          method: "PATCH",
        },
      )

      const apiResult = await processApiResponse<unknown>(response)

      if (!apiResult.success) {
        console.error(
          `[BackendAPI] Failed to close project ${projectId}: ${apiResult.message}`,
        )
        if (apiResult.errors?.length) {
          console.error(`[BackendAPI] Errors:`, apiResult.errors)
        }
        return false
      }

      console.log(`[BackendAPI] Successfully closed project ${projectId}`)
      return true
    } catch (error) {
      console.error(`[BackendAPI] Error closing project ${projectId}:`, error)
      return false
    }
  }

  /**
   * Ensure client is registered before making any API calls
   * Returns true if registration is successful, false otherwise
   */
  private async ensureRegistered(): Promise<boolean> {
    if (this.isRegistered) {
      return true
    }

    try {
      await this.register()
      return true
    } catch (error) {
      return false
    }
  }

  // Fetch a specific project by ID
  async getProjectById(projectId: string): Promise<Project | null> {
    const isRegistered = await this.ensureRegistered()
    if (!isRegistered) {
      console.warn(
        `[BackendAPI] Cannot fetch project ${projectId}: Backend unavailable`,
      )
      return null
    }

    console.log(`[BackendAPI] Fetching project with ID ${projectId}`)

    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`)
      const apiResult = await processApiResponse<Project>(response)

      // Handle warnings and errors, extract data
      const project = handleApiResult(
        apiResult,
        `Fetching project ${projectId}`,
      )

      if (!project) {
        console.warn(
          `[BackendAPI] Project with ID ${projectId} not found or empty data, will try to use cached data`,
        )
        return null
      }

      console.log(`[BackendAPI] Successfully fetched project: ${project.name}`)
      return project
    } catch (error) {
      console.error(`[BackendAPI] Error fetching project ${projectId}:`, error)
      return null
    }
  }

  // Fetch all projects
  async getProjects(): Promise<Project[]> {
    const isRegistered = await this.ensureRegistered()
    if (!isRegistered) {
      console.warn("[BackendAPI] Cannot fetch projects: Backend unavailable")
      return []
    }

    console.log("[BackendAPI] Fetching projects")

    try {
      const response = await fetch(`${this.baseUrl}/projects`)
      const apiResult = await processApiResponse<Project[]>(response)

      // Handle warnings and errors, extract data
      const projects = handleApiResult(apiResult, "Fetching projects") || []

      if (apiResult.success) {
        console.log(`[BackendAPI] Fetched ${projects.length} projects`)
      }

      return projects
    } catch (error) {
      console.error("[BackendAPI] Error fetching projects:", error)
      // Return empty array instead of throwing to fail gracefully
      return []
    }
  }

  // Open a project
  async openProject(projectId: string): Promise<boolean> {
    const isRegistered = await this.ensureRegistered()
    if (!isRegistered) {
      console.warn(
        `[BackendAPI] Cannot open project ${projectId}: Backend unavailable`,
      )
      return false
    }

    console.log(`[BackendAPI] Opening project with ID ${projectId}`)

    try {
      const response = await fetch(
        `${this.baseUrl}/projects/${projectId}/connect-to-project`,
        {
          method: "PATCH",
        },
      )

      const apiResult = await processApiResponse<unknown>(response)

      if (!apiResult.success) {
        console.error(
          `[BackendAPI] Failed to open project ${projectId}: ${apiResult.message}`,
        )
        if (apiResult.errors?.length) {
          console.error(`[BackendAPI] Errors:`, apiResult.errors)
        }
        return false
      }

      console.log(`[BackendAPI] Successfully opened project ${projectId}`)
      return true
    } catch (error) {
      console.error(`[BackendAPI] Error opening project ${projectId}:`, error)
      return false
    }
  }

  /**
   * Register client with the backend
   * Retries up to maxRetries times with retryDelay between attempts
   */
  async register() {
    if (this.isRegistered) {
      return
    }

    // If we've already determined the backend is unavailable, don't retry
    if (!this.isBackendAvailable) {
      throw new Error("Backend is not available")
    }

    let retries = 0
    let lastError: Error | null = null

    while (retries < this.maxRetries) {
      try {
        console.log(
          `[BackendAPI] Attempting to register client (attempt ${retries + 1}/${this.maxRetries})`,
        )

        const response = await fetch(`${this.baseUrl}/auth/register`, {
          body: JSON.stringify({clientName: "audioreach-creator-ui"}),
          headers: {"Content-Type": "application/json"},
          method: "POST",
        })

        const apiResult = await processApiResponse<unknown>(response)

        if (!apiResult.success) {
          throw new Error(
            apiResult.message ||
              `Failed to register client: ${response.status}`,
          )
        }

        this.isRegistered = true
        this.isBackendAvailable = true
        console.log("[BackendAPI] Client registered successfully")
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(
          `[BackendAPI] Registration attempt ${retries + 1} failed: ${lastError.message}`,
        )

        // Wait before retrying
        if (retries < this.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        }

        retries++
      }
    }

    // If we've exhausted all retries, mark the backend as unavailable
    this.isBackendAvailable = false
    console.error(
      `[BackendAPI] Failed to register after ${this.maxRetries} attempts. Backend may be down.`,
    )
    console.error(
      "[BackendAPI] TODO: Implement backend service auto-start mechanism",
    )

    throw (
      lastError ||
      new Error("Failed to register client after multiple attempts")
    )
  }
}

export const backendApi = new BackendApiService()
