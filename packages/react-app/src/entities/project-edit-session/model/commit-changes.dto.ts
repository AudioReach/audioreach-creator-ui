/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface CommitChangesRequestDto {
  changeIds?: string[];
}

export interface CommitChangesResponseDto {
  failedChangeIds: string[];
  message: string;
  missingDependencies?: string[];
  processedChangeIds: string[];
  success: boolean;
}
