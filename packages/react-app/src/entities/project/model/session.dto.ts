/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export const SessionMode = {
  Designer: 'DESIGNER',
  DiffMerge: 'DIFF_MERGE',
  DiscoveryWizard: 'DISCOVERY_WIZARD',
  Readonly: 'READONLY',
  Tuning: 'TUNING',
} as const;

export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];

export interface SessionResponseDto {
  projectId: string;
  sessionMode: SessionMode;
  summary: string;
}
