/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';
import type {
  PatchPropertiesRequestDto,
  PropertiesResponseDto,
  PropertyDto,
} from '~shared/lib/property.dto';
import {unwrapPropertiesResponse} from '~shared/lib/property-api';

export type ContainerPropertiesResponseDto = PropertiesResponseDto;

export interface PatchContainerRequestDto {
  containerId?: string;
}

export interface PatchContainerResponseDto {
  containerId: string;
  systemId: string;
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

export async function patchContainer(
  projectId: string,
  containerId: string,
  request: PatchContainerRequestDto,
): Promise<ApiResult<PatchContainerResponseDto>> {
  return httpClient.patch<PatchContainerResponseDto>(
    `/projects/${projectId}/containers/${containerId}`,
    request,
  );
}

export async function patchContainerProperties(
  projectId: string,
  containerId: string,
  request: PatchPropertiesRequestDto,
): Promise<ApiResult<PropertyDto[]>> {
  return httpClient.patch<PropertyDto[]>(
    `/projects/${projectId}/containers/${containerId}/properties`,
    request,
  );
}
