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

export interface TkvCalDataResponseDto {
  parameters: ParameterDetailDto[];
  systemId: string;
  Tkv: KeyValueDto[];
}

export type TagDataDto = TkvCalDataResponseDto;

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

export interface CreateTagsRequestDto {
  tagDefinitionSystemIds: string[];
}

export interface CreateTkvsRequestDto {
  tkvs: CreateValuesRequestItem[];
}

export interface DeleteTagsRequestDto {
  tagSystemIds: string[];
}

export interface DeleteTkvsRequestDto {
  tkvSystemIds: string[];
}

export interface UpdateSpfModuleTagDataRequest {
  parameters: ParameterDetailDto[];
  uiPersistence?: string;
}

export interface TkvParameterUpdateItem {
  parameterSystemIds: string[];
  tkvSystemId: string;
}

export interface CreateTkvParametersRequestDto {
  updates: TkvParameterUpdateItem[];
}

export interface TkvParameterItem {
  parameters: ParamInfo[];
  tkvSystemId: string;
}

export interface TkvParametersResponseDto {
  tkvParameters: TkvParameterItem[];
}

export interface RemoveTkvParametersRequestDto {
  updates: TkvParameterUpdateItem[];
}

export interface TkvParameterRemovalItem {
  removedParameterSystemIds: string[];
  tkvSystemId: string;
}

export interface TkvParameterRemovalResponseDto {
  updates: TkvParameterRemovalItem[];
}
