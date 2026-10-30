/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function formatModuleInstanceId(instanceId: number): string {
  return `0x${instanceId.toString(16).toUpperCase().padStart(4, '0')}`;
}
