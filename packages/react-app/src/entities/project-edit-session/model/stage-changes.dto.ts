/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface StageChangesRequestDto {
  changeIds: string[];
}

export interface StageChangesResponseDto {
  failedChangeIds: string[];
  message: string;
  processedChangeIds: string[];
  success: boolean;
}
