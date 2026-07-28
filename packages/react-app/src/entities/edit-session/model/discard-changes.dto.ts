/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface DiscardChangesRequestDto {
  changeIds?: string[];
}

export interface DiscardChangesResponseDto {
  cascadedChangeIds: string[];
  failedChangeIds: string[];
  message: string;
  processedChangeIds: string[];
  success: boolean;
}
