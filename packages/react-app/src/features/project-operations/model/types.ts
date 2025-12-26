import type ArcProjectInfo from "~shared/types/arc-project-info"

export interface ProjectOpenResult {
  error?: string
  project?: ArcProjectInfo
  success: boolean
}

export interface ProjectLoadingState {
  isLoading: boolean
  message: string
}

export interface ProjectOpenerHook {
  /** Current loading state */
  loadingState: ProjectLoadingState
  /** Opens a recent project by project info */
  openRecentProject: (project: ArcProjectInfo) => Promise<void>
  /** Opens a workspace project using file picker */
  openWorkspaceProject: () => Promise<void>
}

export interface ProjectLifecycleHook {
  /** Handles project close with screenshot capture */
  handleProjectClose: (
    projectId: string,
    projectName: string,
  ) => Promise<boolean>
  /** Screenshot registry for storing screenshot functions */
  screenshotRegistry: Map<string, () => Promise<string | null>>
}
