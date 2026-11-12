/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface StageUsecasesRequestDto {
  systemIds: string[];
}

export interface StageUsecasesResponseDto {
  failedChangeIds: string[];
  message: string;
  processedChangeIds: string[];
  success: boolean;
}
