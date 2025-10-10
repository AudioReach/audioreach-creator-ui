import {create} from "zustand"

import {backendApi} from "~shared/api/backend-api"

import type {Project} from "./types"

interface ProjectState {
  backendUnavailable: boolean
  clearError: () => void
  currentProject: Project | null
  error: string | null
  fetchProjects: () => Promise<void>
  isLoading: boolean
  openProject: (projectId: string) => Promise<boolean>
  projects: Project[]
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  backendUnavailable: false,
  clearError: () => set({error: null}),
  currentProject: null,
  error: null,
  fetchProjects: async () => {
    console.log("[ProjectStore] Fetching projects")
    set({error: null, isLoading: true})

    try {
      const projects = await backendApi.getProjects()

      // If empty array and not marked as backend unavailable, backend might be down
      if (projects.length === 0 && !get().backendUnavailable) {
        console.warn(
          "[ProjectStore] No projects returned, backend might be unavailable",
        )
        set({
          backendUnavailable: true,
          error:
            "Backend service is unavailable. Please ensure it's running at localhost:3500.",
          isLoading: false,
          projects: [],
        })
      } else {
        console.log(
          `[ProjectStore] Projects fetched successfully: ${projects.length} projects`,
        )
        set({
          // If we successfully get projects, reset the backend unavailable flag
          backendUnavailable: false,
          isLoading: false,
          projects,
        })
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch projects"
      console.error(`[ProjectStore] ${errorMessage}`)

      // Only set error if we haven't already marked the backend as unavailable
      if (!get().backendUnavailable) {
        set({
          backendUnavailable: true,
          error: errorMessage,
          isLoading: false,
        })
      } else {
        set({isLoading: false})
      }
    }
  },
  isLoading: false,
  openProject: async (projectId: string) => {
    console.log(`[ProjectStore] Opening project: ${projectId}`)
    set({error: null, isLoading: true})

    // If backend is unavailable, try to use cached project data
    if (get().backendUnavailable) {
      console.log(
        `[ProjectStore] Backend unavailable, using cached project data for ${projectId}`,
      )
      const {projects} = get()
      const foundProject = projects.find(
        (p: Project) => p.projectId === projectId,
      )

      if (foundProject) {
        console.log(`[ProjectStore] Found cached project: ${foundProject.name}`)
        set({currentProject: foundProject, isLoading: false})
        return true
      } else {
        console.error(
          `[ProjectStore] No cached data available for project ${projectId}`,
        )
        set({
          error: "Cannot open project: Backend service is unavailable",
          isLoading: false,
        })
        return false
      }
    }

    try {
      const success = await backendApi.openProject(projectId)

      if (!success) {
        throw new Error(`Failed to open project ${projectId}`)
      }

      // Try to get the project details
      let project = await backendApi.getProjectById(projectId)

      // If the project details are empty, find the project in the projects list
      if (!project || Object.keys(project).length === 0) {
        console.log(`[ProjectStore] Using cached project data for ${projectId}`)
        const {projects} = get()
        const foundProject = projects.find(
          (p: Project) => p.projectId === projectId,
        )

        if (!foundProject) {
          throw new Error(`Project with ID ${projectId} not found`)
        }

        project = foundProject
      }

      console.log(`[ProjectStore] Project opened successfully: ${project.name}`)
      set({currentProject: project, isLoading: false})
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to open project ${projectId}`
      console.error(`[ProjectStore] ${errorMessage}`)

      // Only set error if we haven't already marked the backend as unavailable
      if (!get().backendUnavailable) {
        set({
          error: errorMessage,
          isLoading: false,
        })
      } else {
        set({isLoading: false})
      }

      return false
    }
  },
  projects: [],
}))
