/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SubgraphResponseDto} from '~entities/subgraph-definitions/model/subgraph-response.dto';
import {type ApiResult, httpClient} from '~shared/api';

import type {ComponentCollectionDto} from '../model/usecase-component.dto';
import type {
  SubsystemFilteredUsecasesDto,
  UsecaseDto,
} from '../model/usecase.dto';

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
 * Delete usecases for the provided system IDs.
 * @param projectId - The unique identifier of the project
 * @param systemIds - Array of usecase system identifiers to delete
 */
export async function deleteUsecases(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<void>> {
  return httpClient.post<void>(`/projects/${projectId}/usecases/delete`, {
    systemIds,
  });
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

/**
 * Search usecases using a structured filter expression.
 * Called when the user types in the search box inside UsecaseSelectionControl.
 * @param projectId - The unique identifier of the project
 * @param filter    - Transformed filter string built by buildUsecaseApiFilter()
 *                    e.g. "subgraphId:42 AND containerId:10"
 * @returns Filtered array of UsecaseDto matching the filter
 */
export async function getUsecasesWithFilter(
  projectId: string,
  filter: string,
): Promise<ApiResult<UsecaseDto[]>> {
  const params = new URLSearchParams({filter});
  return httpClient.get<UsecaseDto[]>(
    `/projects/${projectId}/usecases?${params.toString()}`,
  );
}

/**
 * Fetch usecases grouped by subsystem.
 * Used for Usecase Workflow → Subsystem Level and System Workflow.
 * Each entry in the response represents one subsystem group with its
 * identifying key-value info and the usecases that belong to it.
 * @param projectId - The unique identifier of the project
 * @returns Array of subsystem filtered results
 */
export async function getUsecasesFilteredBySubsystem(
  projectId: string,
): Promise<ApiResult<SubsystemFilteredUsecasesDto[]>> {
  return httpClient.get<SubsystemFilteredUsecasesDto[]>(
    `/projects/${projectId}/usecases/filtered-by-subsystem`,
  );
}

/**
 * Query subgraph details for specified system IDs.
 * @param projectId - The unique identifier of the project
 * @param systemIds - Array of subgraph system identifiers
 * @returns Array of SubgraphResponseDto matching the given system IDs
 */
export async function getSubgraphsByIds(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<SubgraphResponseDto[]>> {
  return httpClient.post<SubgraphResponseDto[]>(
    `/projects/${projectId}/subgraphs/query`,
    {systemIds},
  );
}
