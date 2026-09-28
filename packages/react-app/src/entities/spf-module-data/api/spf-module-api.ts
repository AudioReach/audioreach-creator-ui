/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {
  CalDataDto,
  UpdateSpfModuleCalDataRequest,
} from '../model/spf-module-cal-data.dto';
import type {
  TagDataDto,
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
