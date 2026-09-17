/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ChangeInfoDto,
  KeyValueDto,
  KeyValueInfo,
  ParameterDetailDto,
  ParamInfo,
} from './spf-module-common.dto';

export interface TagDataDto {
  changeInfo: ChangeInfoDto;
  parameters: ParameterDetailDto[];
  systemId: string;
  Tkv: KeyValueDto[];
}

export interface TagInfoDto {
  naturalId: number;
  systemId: string;
  tagName: string;
  tkvs?: TkvDto[];
}

export interface TkvDto {
  keyValuePairs: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface UpdateSpfModuleTagDataRequest {
  data: ParameterDetailDto[];
}
