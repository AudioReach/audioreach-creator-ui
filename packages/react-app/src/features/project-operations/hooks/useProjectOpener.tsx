import {useState} from "react"

import {ProjectService} from "~entities/project/services/projectService"
import useArcRecentProjects from "~features/recent-files/hooks/useArcRecentProjects"
import {showToast} from "~shared/controls/GlobalToaster"
import {logger} from "~shared/lib/logger"
import {ProjectMainTab, useProjectLayoutStore} from "~shared/store"
import type ArcProjectInfo from "~shared/types/arc-project-info"

import type {ProjectLoadingState, ProjectOpenerHook} from "../model/types"

interface UseProjectOpenerOptions {
  /** Callback for handling project close */
  onProjectClose: (projectId: string, projectName: string) => Promise<boolean>
  /** Callback when project is successfully opened */
  onProjectOpened?: (project: ArcProjectInfo) => void
  /** Screenshot registry for GraphDesigner */
  screenshotRegistry: Map<string, () => Promise<string | null>>
}

/**
 * Hook for managing project opening operations
 * Handles both workspace file picker and recent project opening
 */
export function useProjectOpener({
  onProjectClose,
  onProjectOpened,
  screenshotRegistry,
}: UseProjectOpenerOptions): ProjectOpenerHook {
  const [loadingState, setLoadingState] = useState<ProjectLoadingState>({
    isLoading: false,
    message: "",
  })

  const {addToRecent} = useArcRecentProjects()

  /**
   * Common logic to handle successful project opening
   * Creates layout, loads GraphDesigner, and notifies callbacks
   */
  const handleProjectOpenSuccess = async (
    project: ArcProjectInfo,
    usecaseData: any[],
  ) => {
    // Add to recent projects
    addToRecent(project)
    logger.info("Project opened successfully", {
      action: "open_project",
      component: "useProjectOpener",
      projectId: project.id,
    })

    // Create project group in the ProjectLayoutStore
    const layoutStore = useProjectLayoutStore.getState()

    // Create a simple main tab with GraphDesigner
    const emptyLayout = {
      global: {},
      layout: {
        children: [],
        type: "row",
      },
    }

    const mainTab = new ProjectMainTab(
      `project_${project.id}`,
      {flexLayoutData: emptyLayout},
      () => true, // onClose callback
    )

    // Dynamically import and store the GraphDesigner component
    const GraphDesigner = (
      await import("~widgets/graph-designer/ui/GraphDesigner")
    ).default

    // Store the GraphDesigner component in the main tab
    ;(mainTab as any).reactiveComponent = (
      <GraphDesigner
        projectGroupId={project.id}
        screenshotRegistry={screenshotRegistry}
        tabId={mainTab.id}
        usecaseData={usecaseData}
      />
    )

    // Create the project group in layout store with screenshot callback
    layoutStore.createProjectGroup(
      project.id,
      project.filepath,
      project.name,
      mainTab,
      project.description,
      onProjectClose, // onClose callback - captures screenshot before unmount
    )

    // Notify parent component
    onProjectOpened?.(project)

    showToast("Project opened successfully", "success")
  }

  /**
   * Opens a recent project by project info
   */
  const openRecentProject = async (project: ArcProjectInfo) => {
    setLoadingState({
      isLoading: true,
      message: `Opening project: ${project.name}`,
    })

    try {
      const result = await ProjectService.openRecentProject(project)

      if (result.success && result.project) {
        setLoadingState({
          isLoading: true,
          message: "Loading project data...",
        })
        await handleProjectOpenSuccess(result.project, result.usecaseData || [])
      } else {
        showToast(result.message || "Failed to open project", "danger")
      }
    } catch (error) {
      logger.error("Error in openRecentProject", {
        action: "open_recent_project",
        component: "useProjectOpener",
        error: error instanceof Error ? error.message : String(error),
      })
      showToast("Failed to open project", "danger")
    } finally {
      setLoadingState({
        isLoading: false,
        message: "",
      })
    }
  }

  /**
   * Opens a workspace project using file picker
   */
  const openWorkspaceProject = async () => {
    setLoadingState({
      isLoading: true,
      message: "Opening file picker...",
    })

    try {
      const result = await ProjectService.openWorkspaceProjectFromFile()

      // User cancelled - not an error
      if (!result.success && result.message === "File selection cancelled") {
        setLoadingState({
          isLoading: false,
          message: "",
        })
        return
      }

      if (result.success && result.project) {
        setLoadingState({
          isLoading: true,
          message: "Processing AWSP/ACDB files in the project ...",
        })

        // Small delay to show the processing message
        await new Promise((resolve) => setTimeout(resolve, 100))

        setLoadingState({
          isLoading: true,
          message: "Loading project data...",
        })

        await handleProjectOpenSuccess(result.project, result.usecaseData || [])
      } else {
        showToast(result.message || "Failed to open project", "danger")
      }
    } catch (error) {
      logger.error("Error in openWorkspaceProject", {
        action: "open_workspace_project",
        component: "useProjectOpener",
        error: error instanceof Error ? error.message : String(error),
      })
      showToast("Failed to open workspace project", "danger")
    } finally {
      setLoadingState({
        isLoading: false,
        message: "",
      })
    }
  }

  return {
    loadingState,
    openRecentProject,
    openWorkspaceProject,
  }
}
