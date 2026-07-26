/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SessionMode} from './session.dto';

export type ProjectType = 'OFFLINE' | 'DEVICE';

/**
 * Files returned by the backend download-files endpoint
 */
export interface ProjectFilesDownload {
  acdbFile: {content: ArrayBuffer; name: string};
  workspaceFile: {content: ArrayBuffer; name: string};
}

/**
 * Project information returned by the backend
 */
export interface ProjectInfoResponseDto {
  /** Detailed description of the project */
  description: string;
  /** Human-readable name of the project */
  name: string;
  /** Unique identifier of the project */
  projectId: string;
  /** Type of the project (offline or device) */
  projectType: ProjectType;
  /** Current session mode for the project */
  sessionMode: SessionMode;
}
