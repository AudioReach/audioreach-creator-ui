/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {ComponentCollectionDto} from '../model/usecase-component.dto';
import type {UsecaseDto} from '../model/usecase.dto';

/**
 * Fetch all usecases for a specific project.
 * Returns ApiResult<UsecaseDto[]> and does not throw; callers should inspect result.success.
 * @param projectId - The unique identifier of the project
 * @returns Array of usecases directly (not wrapped in a response object)
 */
export async function getAllUsecases(
  projectId: string,
): Promise<ApiResult<UsecaseDto[]>> {
  return httpClient.get<UsecaseDto[]>(`/projects/${projectId}/usecases`);
}

/**
 * Query usecase components for specified system IDs.
 * Returns flat component collection without subsystem hierarchy.
 * @param projectId - The unique identifier of the project
 * @param systemIds - Array of usecase system identifiers
 * @returns ComponentCollectionDto with spfModules, dataLinks, and controlLinks
 */
export async function getUsecaseComponents(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<ComponentCollectionDto>> {
  return httpClient.post<ComponentCollectionDto>(
    `/projects/${projectId}/usecases/components/query`,
    {systemIds},
  );
}
