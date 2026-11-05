/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {
  AddCkvsResponseDto,
  CalDataDto,
  CkvDto,
  CkvParameterRemovalResponseDto,
  CkvParametersResponseDto,
  CreateCkvParametersRequestDto,
  CreateCkvsRequestDto,
  DeleteCkvParametersRequestDto,
  DeleteCkvsRequestDto,
  UpdateSpfModuleCalDataRequest,
} from '../model/spf-module-cal-data.dto';
import type {
  CreateTagsRequestDto,
  CreateTkvParametersRequestDto,
  CreateTkvsRequestDto,
  DeleteTagsRequestDto,
  DeleteTkvsRequestDto,
  RemoveTkvParametersRequestDto,
  TagDataDto,
  TagInfoDto,
  TkvDto,
  TkvParameterRemovalResponseDto,
  TkvParametersResponseDto,
  UpdateSpfModuleTagDataRequest,
} from '../model/spf-module-tag-data.dto';
import type {SpfModuleDto} from '../model/spf-module.dto';

export async function getCalData(
  projectId: string,
  spfModuleSystemId: string,
  ckvSystemId: string,
  paramSystemIds?: string[],
): Promise<ApiResult<CalDataDto>> {
  const params = paramSystemIds?.length
    ? `?param-system-ids=${paramSystemIds.join(',')}`
    : '';
  return httpClient.get<CalDataDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/cal-data/${ckvSystemId}${params}`,
  );
}

export async function putCalData(
  projectId: string,
  spfModuleSystemId: string,
  ckvSystemId: string,
  payload: UpdateSpfModuleCalDataRequest,
  paramSystemIds?: string[],
): Promise<ApiResult<CalDataDto>> {
  const params = paramSystemIds?.length
    ? `?param-system-ids=${paramSystemIds.join(',')}`
    : '';
  return httpClient.put<CalDataDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/cal-data/${ckvSystemId}${params}`,
    payload,
    {retries: 0},
  );
}

export async function getTagData(
  projectId: string,
  spfModuleSystemId: string,
  tagSystemId: string,
  tkvSystemId: string,
  paramSystemIds?: string[],
): Promise<ApiResult<TagDataDto>> {
  const params = paramSystemIds?.length
    ? `?param-system-ids=${paramSystemIds.join(',')}`
    : '';
  return httpClient.get<TagDataDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tag-data/${tagSystemId}/${tkvSystemId}${params}`,
  );
}

export async function putTagData(
  projectId: string,
  spfModuleSystemId: string,
  tagSystemId: string,
  tkvSystemId: string,
  payload: UpdateSpfModuleTagDataRequest,
): Promise<ApiResult<TagDataDto>> {
  return httpClient.put<TagDataDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tag-data/${tagSystemId}/${tkvSystemId}`,
    payload,
    {retries: 0},
  );
}

export async function queryModuleIndices(
  projectId: string,
  moduleSystemId: string,
): Promise<ApiResult<SpfModuleDto[]>> {
  return httpClient.get<SpfModuleDto[]>(
    `/projects/${projectId}/spf-modules?systemId=${moduleSystemId}&include=ckvs,tags`,
  );
}

export async function createCkvs(
  projectId: string,
  spfModuleSystemId: string,
  payload: CreateCkvsRequestDto,
): Promise<ApiResult<AddCkvsResponseDto>> {
  return httpClient.post<AddCkvsResponseDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/ckvs`,
    payload,
  );
}

export async function deleteCkvs(
  projectId: string,
  spfModuleSystemId: string,
  payload: DeleteCkvsRequestDto,
): Promise<ApiResult<CkvDto[]>> {
  return httpClient.delete<CkvDto[]>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/ckvs`,
    payload,
  );
}

export async function createTags(
  projectId: string,
  spfModuleSystemId: string,
  payload: CreateTagsRequestDto,
): Promise<ApiResult<TagInfoDto[]>> {
  return httpClient.post<TagInfoDto[]>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tags`,
    payload,
  );
}

export async function deleteTags(
  projectId: string,
  spfModuleSystemId: string,
  payload: DeleteTagsRequestDto,
): Promise<ApiResult<TagInfoDto[]>> {
  return httpClient.delete<TagInfoDto[]>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tags`,
    payload,
  );
}

export async function createTkvs(
  projectId: string,
  spfModuleSystemId: string,
  tagSystemId: string,
  payload: CreateTkvsRequestDto,
): Promise<ApiResult<TkvDto[]>> {
  return httpClient.post<TkvDto[]>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tags/${tagSystemId}/tkvs`,
    payload,
  );
}

export async function deleteTkvs(
  projectId: string,
  spfModuleSystemId: string,
  tagSystemId: string,
  payload: DeleteTkvsRequestDto,
): Promise<ApiResult<TkvDto[]>> {
  return httpClient.delete<TkvDto[]>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tags/${tagSystemId}/tkvs`,
    payload,
  );
}

export async function createCkvParameters(
  projectId: string,
  spfModuleSystemId: string,
  payload: CreateCkvParametersRequestDto,
): Promise<ApiResult<CkvParametersResponseDto>> {
  return httpClient.post<CkvParametersResponseDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/ckv-parameters`,
    payload,
  );
}

export async function deleteCkvParameters(
  projectId: string,
  spfModuleSystemId: string,
  payload: DeleteCkvParametersRequestDto,
): Promise<ApiResult<CkvParameterRemovalResponseDto>> {
  return httpClient.delete<CkvParameterRemovalResponseDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/ckv-parameters`,
    payload,
  );
}

export async function createTkvParameters(
  projectId: string,
  spfModuleSystemId: string,
  payload: CreateTkvParametersRequestDto,
): Promise<ApiResult<TkvParametersResponseDto>> {
  return httpClient.post<TkvParametersResponseDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tkv-parameters`,
    payload,
  );
}

export async function deleteTkvParameters(
  projectId: string,
  spfModuleSystemId: string,
  payload: RemoveTkvParametersRequestDto,
): Promise<ApiResult<TkvParameterRemovalResponseDto>> {
  return httpClient.delete<TkvParameterRemovalResponseDto>(
    `/projects/${projectId}/spf-modules/${spfModuleSystemId}/tkv-parameters`,
    payload,
  );
}
