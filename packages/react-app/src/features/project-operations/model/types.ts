/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type ProjectInfo from '~entities/project/model/project-info.types';

export interface ProjectOpenResult {
  error?: string;
  project?: ProjectInfo;
  success: boolean;
}

export interface ProjectLoadingState {
  isLoading: boolean;
  message: string;
}

export interface ProjectOpenerHook {
  /** Current loading state */
  loadingState: ProjectLoadingState;
  /** Opens a recent project by project info */
  openRecentProject: (project: ProjectInfo) => Promise<void>;
  /** Opens a workspace project using file picker */
  openWorkspaceProject: () => Promise<void>;
}

export interface ProjectLifecycleHook {
  /** Handles project close with screenshot capture */
  handleProjectClose: (
    projectId: string,
    projectName: string,
  ) => Promise<boolean>;
  /** Screenshot registry for storing screenshot functions */
  screenshotRegistry: Map<string, () => Promise<string | null>>;
}
