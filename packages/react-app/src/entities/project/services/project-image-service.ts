import {logger} from "~shared/lib/logger"

/**
 * Service for managing project screenshots
 * Handles screenshot capture and MRU store integration
 */
export class ProjectImageService {
  /**
   * Captures and saves a project screenshot to MRU store
   * @param projectId - The project ID
   * @param screenshotFn - Function that captures the screenshot
   * @returns Promise that resolves when screenshot is saved
   */
  static async captureAndSave(
    projectId: string,
    screenshotFn: () => Promise<string | null>,
  ): Promise<void> {
    if (!window.mruStoreApi) {
      logger.warn("MRU Store API not available", {
        action: "capture_screenshot",
        component: "ProjectImageService",
        projectId,
      })
      return
    }

    try {
      logger.verbose("Capturing project screenshot", {
        action: "capture_screenshot",
        component: "ProjectImageService",
        projectId,
      })

      const imageData = await screenshotFn()

      if (imageData) {
        // Save to MRU in background (non-blocking)
        await window.mruStoreApi.updateProjectImage(projectId, imageData)

        logger.info("Project screenshot saved to MRU", {
          action: "save_screenshot",
          component: "ProjectImageService",
          projectId,
        })
      }
    } catch (error) {
      logger.error("Failed to capture/save screenshot", {
        action: "capture_screenshot",
        component: "ProjectImageService",
        error: error instanceof Error ? error.message : String(error),
        projectId,
      })
      throw error
    }
  }
}
