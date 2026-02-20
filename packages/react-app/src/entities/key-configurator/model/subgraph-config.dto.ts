/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface SubgraphConfigDto {
  sgkvs: SgkvDto[];
  systemId: string;
}

export interface SgkvDto {
  systemId: string;
}
