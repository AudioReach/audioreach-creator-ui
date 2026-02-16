/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type ProjectType = 'OFFLINE' | 'DEVICE';

export enum SessionMode {
  DiffMerge = 'diff-merge',
  Desginer = 'designer',
  Simulation = 'simulation',
  Connected = 'connected',
  Disconnected = 'disconnected',
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
