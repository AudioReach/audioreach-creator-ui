/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  KeyValueDto,
  KeyValueInfo,
  ParameterDetailDto,
  ParamInfo,
} from './spf-module-common.dto';

export interface CkvCalDataResponseDto {
  Ckv: KeyValueDto[];
  parameters: ParameterDetailDto[];
  systemId: string;
}

export type CalDataDto = CkvCalDataResponseDto;

export interface CkvDto {
  keyValuePairs: KeyValueInfo[];
  supportedParameters: ParamInfo[];
  systemId: string;
}

export interface UpdateSpfModuleCalDataRequest {
  parameters: ParameterDetailDto[];
  uiPersistence?: string;
}
