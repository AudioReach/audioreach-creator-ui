/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';
import type {ControlLinkDto} from '~entities/usecases/model/usecase-component.dto';
import type {
  PatchPropertiesRequestDto,
  PropertiesResponseDto,
  PropertyDto,
} from '~shared/lib/property.dto';
import {unwrapPropertiesResponse} from '~shared/lib/property-api';

export type ControlLinkPropertiesResponseDto = PropertiesResponseDto;
export type ControlLinkResponseDto = ControlLinkDto;

export async function fetchControlLinkProperties(
  projectId: string,
  controlLinkId: string,
): Promise<ApiResult<PropertyDto[]>> {
  const result = await httpClient.get<ControlLinkPropertiesResponseDto>(
    `/projects/${projectId}/control-links/${controlLinkId}/properties`,
  );
  return unwrapPropertiesResponse(result);
}

export async function patchControlLinkProperties(
  projectId: string,
  controlLinkId: string,
  request: PatchPropertiesRequestDto,
): Promise<ApiResult<ControlLinkResponseDto[]>> {
  return httpClient.patch<ControlLinkResponseDto[]>(
    `/projects/${projectId}/control-links/${controlLinkId}/properties`,
    request,
  );
}
