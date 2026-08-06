/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SpfModuleDto} from '~entities/usecases/model/usecase-component.dto';
import {type ApiResult, httpClient} from '~shared/api';

import type {
  CreateSpfModuleRequestDto,
  PatchSpfModuleRequestDto,
  RemoveSpfModuleResponseDto,
} from '../model/spf-module-crud.dto';

/**
 * Create a new SPF module instance.
 * @param projectId - The unique identifier of the project
 * @param request - Module creation payload; container/subgraph fields
 *   omitted let the backend auto-create the missing container/subgraph
 */
export async function createSpfModule(
  projectId: string,
  request: CreateSpfModuleRequestDto,
): Promise<ApiResult<SpfModuleDto>> {
  return httpClient.post<SpfModuleDto>(
    `/projects/${projectId}/spf-modules`,
    request,
  );
}

/**
 * Delete a SPF module instance. The backend cascades to every data/control
 * link that referenced it.
 * @param projectId - The unique identifier of the project
 * @param moduleSystemId - The module instance's systemId
 */
export async function deleteSpfModule(
  projectId: string,
  moduleSystemId: string,
): Promise<ApiResult<RemoveSpfModuleResponseDto>> {
  return httpClient.delete<RemoveSpfModuleResponseDto>(
    `/projects/${projectId}/spf-modules/${moduleSystemId}`,
  );
}

/**
 * Patch a SPF module instance's alias, container, or port-count fields.
 * @param projectId - The unique identifier of the project
 * @param moduleSystemId - The module instance's systemId
 * @param request - Partial patch payload; only provided fields are updated
 */
export async function patchSpfModule(
  projectId: string,
  moduleSystemId: string,
  request: PatchSpfModuleRequestDto,
): Promise<ApiResult<SpfModuleDto>> {
  return httpClient.patch<SpfModuleDto>(
    `/projects/${projectId}/spf-modules/${moduleSystemId}`,
    request,
  );
}
