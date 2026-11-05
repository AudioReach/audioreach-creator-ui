/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  CreateValuesRequestItem,
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

export interface AddCkvsResponseDto {
  addedCkvs: CkvDto[];
  removedCkvSystemIds: string[];
}

export interface CreateCkvsRequestDto {
  ckvs: CreateValuesRequestItem[];
}

export interface DeleteCkvsRequestDto {
  ckvSystemIds: string[];
}

export interface UpdateSpfModuleCalDataRequest {
  parameters: ParameterDetailDto[];
  uiPersistence?: string;
}

export interface CreateCkvParametersRequestDto {
  parameterSystemIds: string[];
}

export interface CkvParametersResponseDto {
  parameters: ParamInfo[];
}

export interface DeleteCkvParametersRequestDto {
  parameterSystemIds: string[];
}

export interface CkvParameterRemovalResponseDto {
  affectedCkvSystemIds: string[];
  removedCkvSystemIds: string[];
  removedParameterSystemIds: string[];
}
