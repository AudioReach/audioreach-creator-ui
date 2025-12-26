import {useRef} from "react"

import {ProjectImageService} from "~entities/project/services/projectImageService"
import {logger} from "~shared/lib/logger"

import type {ProjectLifecycleHook} from "../model/types"

/**
 * Hook for managing project lifecycle events
 * Handles project close with screenshot capture
 */
export function useProjectLifecycle(): ProjectLifecycleHook {
  // Local screenshot registry - stores screenshot functions for each project
  const screenshotRegistryRef = useRef<
    Map<string, () => Promise<string | null>>
  >(new Map())

  /**
   * Handles project close - captures screenshot and updates MRU
   * This runs BEFORE the project is removed, while GraphDesigner is still mounted
   */
  const handleProjectClose = async (
    projectId: string,
    projectName: string,
  ): Promise<boolean> => {
    logger.verbose(`Closing project: ${projectName}`, {
      action: "close_project",
      component: "useProjectLifecycle",
      projectId,
    })

    try {
      const screenshotFn = screenshotRegistryRef.current.get(projectId)

      if (screenshotFn) {
        // Capture screenshot BEFORE component unmounts
        await ProjectImageService.captureAndSave(projectId, screenshotFn)
      }
    } catch (error) {
      logger.error("Failed to capture screenshot during project close", {
        action: "close_project",
        component: "useProjectLifecycle",
        error: error instanceof Error ? error.message : String(error),
        projectId,
      })
      // Don't block close on screenshot failure
    } finally {
      // Cleanup registry
      screenshotRegistryRef.current.delete(projectId)
    }

    // Allow close to proceed
    return true
  }

  return {
    handleProjectClose,
    screenshotRegistry: screenshotRegistryRef.current,
  }
}
