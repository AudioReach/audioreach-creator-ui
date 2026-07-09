/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function parseQFormatN(qFormat: string): number {
  const m = qFormat.match(/^[Qq](\d+)$/);
  return m ? parseInt(m[1], 10) : 15;
}
