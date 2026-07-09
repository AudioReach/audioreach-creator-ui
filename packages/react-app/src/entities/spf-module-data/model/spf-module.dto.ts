/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from './spf-module-cal-data.dto';
import type {ChangeInfoDto} from './spf-module-common.dto';
import type {TagInfoDto} from './spf-module-tag-data.dto';

/**
 * Partial mirror of the swagger `SpfModuleDto`. Only the fields the
 * module-data-slice reads from `queryModuleIndices` are modeled here —
 * `id`, ports, endpoint links, and property arrays are omitted
 * deliberately. Add them when a consumer actually needs them.
 */
export interface SpfModuleDto {
  changeInfo: ChangeInfoDto;
  ckvs?: CkvDto[];
  name?: string;
  systemId: string;
  tags?: TagInfoDto[];
}

export interface SystemIdsRequestDto {
  systemIds: string[];
}
