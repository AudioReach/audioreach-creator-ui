/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type ApiResult,
  createCommaSeparatedQueryParam,
  httpClient,
} from '~shared/api';
import type {
  PropertiesResponseDto,
  PropertyDto,
  UpdatePropertyRequestDto,
} from '~shared/lib/property.dto';
import {unwrapPropertiesResponse} from '~shared/lib/property-api';

export type ContainerPropertiesResponseDto = PropertiesResponseDto;

export interface ContainerResponseDto {
  naturalId: number;
  systemId: string;
}

export interface UpdateSubgraphContainerIdRequestDto {
  newContainerNaturalId: number;
  oldContainerNaturalId: number;
}

export interface UpdateSubgraphContainerIdResponseDto {
  newContainerNaturalId: number;
  newContainerSystemId: string;
}

export async function fetchContainerProperties(
  projectId: string,
  containerId: string,
): Promise<ApiResult<PropertyDto[]>> {
  const result = await httpClient.get<ContainerPropertiesResponseDto>(
    `/projects/${projectId}/containers/${containerId}/properties`,
  );
  return unwrapPropertiesResponse(result);
}

export async function getContainersBySystemIds(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<ContainerResponseDto[]>> {
  const systemIdParam = createCommaSeparatedQueryParam('systemId', systemIds);
  const query = systemIdParam ? `?${systemIdParam}` : '';
  return httpClient.get<ContainerResponseDto[]>(
    `/projects/${projectId}/containers${query}`,
  );
}

export async function updateContainerId(
  projectId: string,
  subgraphSystemId: string,
  request: UpdateSubgraphContainerIdRequestDto,
): Promise<ApiResult<UpdateSubgraphContainerIdResponseDto>> {
  return httpClient.patch<UpdateSubgraphContainerIdResponseDto>(
    `/projects/${projectId}/subgraphs/${subgraphSystemId}/container-id`,
    request,
  );
}

export async function patchContainerProperty(
  projectId: string,
  containerId: string,
  propSystemId: string,
  request: UpdatePropertyRequestDto,
): Promise<ApiResult<PropertyDto>> {
  return httpClient.put<PropertyDto>(
    `/projects/${projectId}/containers/${containerId}/properties/${propSystemId}`,
    request,
  );
}
