import {useCallback, useEffect, useState} from "react"

import {ApiRequest} from "@audioreach-creator-ui/api-utils"
import {toPng} from "html-to-image"

import {electronApi} from "~shared/api"
import {logger} from "~shared/lib/logger"
import type ArcProjectInfo from "~shared/types/arc-project-info"

const MRU_LOCAL_STORE_KEY: string = "arc.mru.config"

/** The Most Recently Used (MRU) configuration */
interface MruConfiguration {
  /** A list of in-active projects ordered by  most recent (first index) to least recent (last index) */
  projects: ArcProjectInfo[]
}

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
  /** Retrieves a list of previously opened projects in the order of most to least recent */
  const getRecentConfig: () => Promise<ArcProjectInfo[]> =
    useCallback(async () => {
      let mru: MruConfiguration = {projects: []}

      const data = window.localStorage.getItem(MRU_LOCAL_STORE_KEY)

      if (data === null) {
        return []
      }

      try {
        mru = JSON.parse(data)
      } catch (error) {
        logger.error("Error parsing MRU configuration", {
          component: "useArcRecentProjects",
          error: error instanceof Error ? error.message : String(error),
        })
        return []
      }

      // Create an array of promises for each project
      const projectPromises = mru.projects.map(async (project) => {
        try {
          const modificationDate = await getFileModificationDate(
            project.filepath,
          )

          return {
            description: project.description,
            filepath: project.filepath,
            // Use project's existing ID or filepath as a fallback
            id: project.id || project.filepath,
            lastModifiedDate: modificationDate,
            name: project.name,
          } as ArcProjectInfo
        } catch (error) {
          logger.error(`Error processing project ${project.name}`, {
            component: "useArcRecentProjects",
            error: error instanceof Error ? error.message : String(error),
          })
          throw error
        }
      })

      // Wait for all promises to settle and filter out the rejected ones
      const results = await Promise.allSettled(projectPromises)

      // Filter to only include fulfilled promises and extract their values
      return results
        .filter(
          (result): result is PromiseFulfilledResult<ArcProjectInfo> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value)
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
    // Get current MRU configuration
    const currentMru = await getRecentConfig()

    // Filter out the project with the matching ID
    const updatedMru = currentMru.filter(
      (project: ArcProjectInfo) => project.id !== projectId,
    )

    // Update the MRU configuration
    createRecentConfig(updatedMru)

    // Update the state
    setRecentProjects(updatedMru)

    return updatedMru
  }

  /** Adds a new project to the recent files list. The project will be ignored
   * if its file path already exist in the recent file list
   *
   * @param project The project to add to the recent files list
   * @returns n/a
   */
  async function addToRecent(project: ArcProjectInfo) {
    const currentMru = await getRecentConfig()

    // prevent adding the same project to the mru
    if (-1 !== currentMru.findIndex((p) => p.filepath === project.filepath)) {
      return
    }

    project.lastModifiedDate = await getFileModificationDate(project.filepath)

    setRecentProjects((currentProjects) => {
      const updatedProjects = [project, ...currentProjects]

      // Also update the stored configuration
      createRecentConfig(updatedProjects)

      return updatedProjects
    })
    // const updatedMru = [...currentMru, project]

    // createMruConfig(updatedMru)

    // // Update the state
    // setProjectMru(updatedMru)

    // return updatedMru
  }

  async function updateImage(projectId: string, htmlElem: HTMLElement) {
    // Get current MRU configuration
    const currentMru = await getRecentConfig()

    const project = currentMru.find(
      (project: ArcProjectInfo) => project.id === projectId,
    )

    if (project === undefined) {
      logger.warn("Unable to update image. Project not found", {
        component: "useArcRecentProjects",
      })
      return
    }

    // use toPng to convert the html element to a base64 encoded png string
    project.image = await toPng(htmlElem)

    // Update the MRU configuration
    createRecentConfig(currentMru)

    // Update the state
    setRecentProjects(currentMru)
  }

  /** Converts a list of projects to JSON to store in the localstore
   *
   * @param projects A list of projects to add to the localstore
   */
  function createRecentConfig(projects: ArcProjectInfo[]) {
    // generate the MRU configuration file

    const config: MruConfiguration = {
      projects: [...projects],
    }

    const configData = JSON.stringify(config)

    window.localStorage.setItem(MRU_LOCAL_STORE_KEY, configData)
  }

  /** Retrieves the last modified date of the provided file
   *
   * @param filepath The file to retrieve the modification date for
   * @returns A date object on success, otherwise undefined
   */
  async function getFileModificationDate(
    filepath: string,
  ): Promise<Date | undefined> {
    let date: Date = new Date()
    if (!electronApi) {
      logger.error("Electron API not available", {
        component: "useArcRecentProjects",
      })
      return undefined
    }

    try {
      // Open a project file
      const response = await electronApi.send({
        data: {filepath},
        requestType: ApiRequest.GetProjectFileModificationDate,
      })

      if (response.data.date === undefined) {
        logger.info(`Message: ${response.message}. File: ${filepath}`, {
          component: "useArcRecentProjects",
        })
      }

      date = response.data.date
    } catch (error) {
      logger.error(
        "Encountered an error while trying to get file modification date",
        {
          component: "useArcRecentProjects",
          error: error instanceof Error ? error.message : String(error),
        },
      )
    } finally {
    }

    return date
  }

  return {
    addToRecent,
    projects: recentProjects,
    removeFromRecent,
    updateImage,
  }
}
