import {useCallback, useEffect, useState} from "react"

import type {MruProjectInfo} from "@audioreach-creator-ui/api-utils"
import {toPng} from "html-to-image"

import {getProjects} from "~entities/project/api/projectsApi"
import {logger} from "~shared/lib/logger"
import type ArcProjectInfo from "~shared/types/arc-project-info"

interface ArcRecentProjectsApi {
  /** Adds a new project to the recent files list. The project will be ignored
   * if its file path already exist in the recent file list
   *
   * @param project The project to add to the recent files list
   * @returns n/a
   */
  addToRecent: (project: ArcProjectInfo) => void

  /** A list of recent projects in the order of most to least recent */
  projects: ArcProjectInfo[]

  /** Removes a project from the recent files list
   *
   * @param projectId The ID of the project
   * @returns n/a
   */
  removeFromRecent: (projectId: string) => void

  /** Stores a base 64 encoded image alonside a project in the recent files list
   *
   * @param projectId The ID of the project
   * @param htmlElem An html element representing the graph view
   * @returns
   */
  updateImage: (projectId: string, htmlElem: HTMLElement) => void
}

/** A hook containing functionality for managing the recent files list containing files in the order of most to least recent
 * @returns
 */
export default function useArcRecentProjects(): ArcRecentProjectsApi {
  const [recentProjects, setRecentProjects] = useState<ArcProjectInfo[]>([])

  /**
   * Retrieves and merges projects from backend and MRU store
   * - Backend contains ONLY currently active/open projects
   * - MRU contains ALL projects (open + closed) with persistent metadata
   * - Returns: All MRU projects (in MRU order) enriched with backend data if active
   */
  const getRecentConfig: () => Promise<ArcProjectInfo[]> =
    useCallback(async () => {
      try {
        // 1. Get MRU projects (master list - contains all projects)
        if (!window.mruStoreApi) {
          logger.warn("MRU Store API not available", {
            component: "useArcRecentProjects",
          })
          return []
        }

        const mruProjects = await window.mruStoreApi.getRecentProjects()

        // 2. Get currently active projects from backend
        const backendResult = await getProjects()

        if (!backendResult.success) {
          logger.warn(
            `Failed to fetch active projects from backend: ${backendResult.message}`,
            {
              component: "useArcRecentProjects",
            },
          )
          // Backend unavailable - return MRU projects only (all marked as inactive)
          return mruProjects.map((mruProject) => ({
            description: mruProject.description || "",
            filepath: mruProject.filepath,
            id: mruProject.id,
            image: mruProject.image,
            lastModifiedDate: mruProject.lastModifiedDate
              ? new Date(mruProject.lastModifiedDate)
              : undefined,
            name: mruProject.name,
          }))
        }

        const activeProjects = backendResult.data || []

        // 3. Create a map of active projects by ID for quick lookup
        const activeProjectMap = new Map(
          activeProjects.map((p) => [p.projectId, p]),
        )

        // 4. Build merged list: All MRU projects enriched with backend data if active
        const mergedProjects: ArcProjectInfo[] = []
        const processedIds = new Set<string>()

        // Process all MRU projects (in MRU order)
        for (const mruProject of mruProjects) {
          const activeProject = activeProjectMap.get(mruProject.id)

          if (activeProject) {
            // Project is OPEN - merge backend data with MRU metadata
            mergedProjects.push({
              description:
                activeProject.description || mruProject.description || "",
              filepath: mruProject.filepath,
              id: activeProject.projectId,
              image: mruProject.image, // Always from MRU (persistent)
              lastModifiedDate: mruProject.lastModifiedDate
                ? new Date(mruProject.lastModifiedDate)
                : undefined,
              name: activeProject.name || mruProject.name,
              sessionMode: activeProject.sessionMode,
            })
          } else {
            // Project is CLOSED - use MRU data only
            mergedProjects.push({
              description: mruProject.description || "",
              filepath: mruProject.filepath,
              id: mruProject.id,
              image: mruProject.image,
              lastModifiedDate: mruProject.lastModifiedDate
                ? new Date(mruProject.lastModifiedDate)
                : undefined,
              name: mruProject.name,
            })
          }

          processedIds.add(mruProject.id)
        }

        // 5. Add any NEW active projects not yet in MRU (edge case - just opened)
        // Note: These won't have filepath or lastModifiedDate until added to MRU
        for (const activeProject of activeProjects) {
          if (!processedIds.has(activeProject.projectId)) {
            mergedProjects.push({
              description: activeProject.description || "",
              filepath: "", // Will be set when project is added to MRU
              id: activeProject.projectId,
              image: undefined, // No image yet for new projects
              lastModifiedDate: undefined, // Will be set when added to MRU
              name: activeProject.name || "Unnamed Project",
              sessionMode: activeProject.sessionMode,
            })
          }
        }

        return mergedProjects
      } catch (error) {
        logger.error("Error loading and merging projects", {
          component: "useArcRecentProjects",
          error: error instanceof Error ? error.message : String(error),
        })
        return []
      }
    }, [])

  // Load projects when the component mounts
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const loadedProjects = await getRecentConfig()
        setRecentProjects(loadedProjects)
      } catch (error) {
        logger.error("Error loading recent projects", {
          component: "useArcRecentProjects",
          error: error instanceof Error ? error.message : String(error),
        })
        setRecentProjects([])
      }
    }

    loadProjects()
  }, [getRecentConfig])

  /** Removes a project from the recent files list
   *
   * @param projectId The ID of the project
   * @returns n/a
   */
  async function removeFromRecent(projectId: string) {
    if (!window.mruStoreApi) {
      logger.error("MRU Store API not available", {
        component: "useArcRecentProjects",
      })
      return
    }

    try {
      await window.mruStoreApi.removeProject(projectId)

      // Update local state
      const updatedProjects = await getRecentConfig()
      setRecentProjects(updatedProjects)
    } catch (error) {
      logger.error("Error removing project from MRU", {
        component: "useArcRecentProjects",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /** Adds a new project to the recent files list. The project will be ignored
   * if its file path already exist in the recent file list
   *
   * @param project The project to add to the recent files list
   * @returns n/a
   */
  async function addToRecent(project: ArcProjectInfo) {
    if (!window.mruStoreApi) {
      logger.error("MRU Store API not available", {
        component: "useArcRecentProjects",
      })
      return
    }

    try {
      // Convert ArcProjectInfo to MruProjectInfo
      const mruProject: MruProjectInfo = {
        description: project.description,
        filepath: project.filepath,
        id: project.id,
        image: project.image,
        lastModifiedDate: project.lastModifiedDate?.toISOString(),
        name: project.name,
      }

      await window.mruStoreApi.addProject(mruProject)

      // Update local state
      const updatedProjects = await getRecentConfig()
      setRecentProjects(updatedProjects)
    } catch (error) {
      logger.error("Error adding project to MRU", {
        component: "useArcRecentProjects",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function updateImage(projectId: string, htmlElem: HTMLElement) {
    if (!window.mruStoreApi) {
      logger.error("MRU Store API not available", {
        component: "useArcRecentProjects",
      })
      return
    }

    try {
      // Convert the html element to a base64 encoded png string
      const imageData = await toPng(htmlElem)

      await window.mruStoreApi.updateProjectImage(projectId, imageData)

      // Update local state
      const updatedProjects = await getRecentConfig()
      setRecentProjects(updatedProjects)
    } catch (error) {
      logger.error("Error updating project image in MRU", {
        component: "useArcRecentProjects",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    addToRecent,
    projects: recentProjects,
    removeFromRecent,
    updateImage,
  }
}
