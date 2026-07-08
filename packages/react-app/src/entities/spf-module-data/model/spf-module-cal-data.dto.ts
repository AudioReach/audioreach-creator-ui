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

export interface CalDataDto {
  changeInfo: ChangeInfoDto;
  Ckv: KeyValueDto[];
  parameters: ParameterDetailDto[];
  systemId: string;
}

export interface CkvDto {
  keyValueCollection: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface UpdateSpfModuleCalDataRequest {
  data: ParameterDetailDto[];
}
