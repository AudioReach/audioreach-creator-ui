/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';
import type {
  PropertiesResponseDto,
  PropertyDto,
  UpdatePropertyRequestDto,
} from '~shared/lib/property.dto';
import {unwrapPropertiesResponse} from '~shared/lib/property-api';

export interface PatchSubgraphRequestDto {
  name: string;
}

export interface PatchSubgraphResponseDto {
  name: string;
  subGraphSharedType: string;
  systemId: string;
}

export interface PatchSubgraphVsidResponseDto {
  affectedSubgraphSystemIds: string[];
}

export async function fetchSubgraphProperties(
  projectId: string,
  subgraphId: string,
): Promise<ApiResult<PropertyDto[]>> {
  const result = await httpClient.get<PropertiesResponseDto>(
    `/projects/${projectId}/subgraphs/${subgraphId}/properties`,
  );
  return unwrapPropertiesResponse(result);
}

export async function patchSubgraph(
  projectId: string,
  subgraphId: string,
  request: PatchSubgraphRequestDto,
): Promise<ApiResult<PatchSubgraphResponseDto>> {
  return httpClient.patch<PatchSubgraphResponseDto>(
    `/projects/${projectId}/subgraphs/${subgraphId}`,
    request,
  );
}

export async function patchSubgraphProperty(
  projectId: string,
  subgraphId: string,
  propSystemId: string,
  request: UpdatePropertyRequestDto,
): Promise<ApiResult<PropertyDto>> {
  return httpClient.patch<PropertyDto>(
    `/projects/${projectId}/subgraphs/${subgraphId}/properties/${propSystemId}`,
    request,
  );
}

export async function patchSubgraphScenario(
  projectId: string,
  subgraphId: string,
  request: UpdatePropertyRequestDto,
): Promise<ApiResult<unknown>> {
  return httpClient.patch<unknown>(
    `/projects/${projectId}/subgraphs/${subgraphId}/scenario`,
    request,
  );
}

export async function patchSubgraphVsid(
  projectId: string,
  subgraphId: string,
  request: UpdatePropertyRequestDto,
): Promise<ApiResult<PatchSubgraphVsidResponseDto>> {
  return httpClient.patch<PatchSubgraphVsidResponseDto>(
    `/projects/${projectId}/subgraphs/${subgraphId}/vsid`,
    request,
  );
}
