/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export const SessionMode = {
  Connected: 'CONNECTED',
  Designer: 'DESIGNER',
  DiffMerge: 'DIFF_MERGE',
  Disconnected: 'DISCONNECTED',
  DiscoveryWizard: 'DISCOVERY_WIZARD',
  Readonly: 'READONLY',
  Simulation: 'SIMULATION',
  Tuning: 'TUNING',
} as const;

export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];

export interface SessionResponseDto {
  projectId: string;
  sessionMode: SessionMode;
  summary: string;
}
