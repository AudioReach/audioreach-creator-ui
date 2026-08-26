/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  SetSubgraphNameRequestDto,
  SubgraphPairResponseDto,
  SubgraphResponseDto,
} from '~entities/subgraph-definitions/model/subgraph-response.dto';
import {type ApiResult, httpClient} from '~shared/api';

import type {
  ComponentCollectionDto,
  ControlLinkDto,
  CreateControlLinkRequest,
  CreateDataLinkRequest,
  DataLinkDto,
  LinkOperationResult,
  ControlLinkWithUsecasesDto,
  DataLinkWithUsecasesDto,
  SpfModuleDto,
} from '../model/usecase-component.dto';
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

/**
 * Fetch a subgraph's full component snapshot (modules + links) — used to
 * render a palette-placed subgraph for the first time. Every entry's
 * changeInfo.changeType is 'NONE': this is a snapshot, not a delta.
 * @param projectId - The unique identifier of the project
 * @param subgraphSystemId - The subgraph's systemId
 */
export async function getSubgraphContents(
  projectId: string,
  subgraphSystemId: string,
): Promise<ApiResult<ComponentCollectionDto>> {
  return httpClient.get<ComponentCollectionDto>(
    `/projects/${projectId}/subgraphs/${subgraphSystemId}/components`,
  );
}

/**
 * Fetch every data-link connection at a port, each paired with the
 * usecases it belongs to.
 * @param projectId - The unique identifier of the project
 * @param componentSystemId - The systemId of the module owning the port
 * @param portSystemId - The systemId of the port being queried
 * @returns Array of DataLinkWithUsecasesDto for the given port
 */
export async function getDataLinkWithUsecases(
  projectId: string,
  componentSystemId: string,
  portSystemId: string,
): Promise<ApiResult<DataLinkWithUsecasesDto[]>> {
  const params = new URLSearchParams({componentSystemId, portSystemId});
  return httpClient.get<DataLinkWithUsecasesDto[]>(
    `/projects/${projectId}/usecases/data-link?${params.toString()}`,
  );
}

/**
 * Fetch every subgraph-pair link bundle involving the given subgraph, used
 * to render cross-subgraph connections once both sides are on canvas.
 * @param projectId - The unique identifier of the project
 * @param subgraphSystemId - The subgraph's systemId
 */
export async function getSubgraphPairs(
  projectId: string,
  subgraphSystemId: string,
): Promise<ApiResult<SubgraphPairResponseDto[]>> {
  return httpClient.get<SubgraphPairResponseDto[]>(
    `/projects/${projectId}/subgraphs/${subgraphSystemId}/subgraph-pairs`,
  );
}

/**
 * Fetch every control-link connection at a port, each paired with the
 * usecases it belongs to.
 * @param projectId - The unique identifier of the project
 * @param componentSystemId - The systemId of the module owning the port
 * @param portSystemId - The systemId of the port being queried
 * @returns Array of ControlLinkWithUsecasesDto for the given port
 */
export async function getControlLinkWithUsecases(
  projectId: string,
  componentSystemId: string,
  portSystemId: string,
): Promise<ApiResult<ControlLinkWithUsecasesDto[]>> {
  const params = new URLSearchParams({componentSystemId, portSystemId});
  return httpClient.get<ControlLinkWithUsecasesDto[]>(
    `/projects/${projectId}/usecases/control-link?${params.toString()}`,
  );
}

/**
 * Rename a subgraph. Also the target of subgraph-proxy rename — both
 * represent the same underlying subgraphId, so there is no separate
 * proxy-rename endpoint.
 * @param projectId - The unique identifier of the project
 * @param subgraphSystemId - The subgraph's systemId
 * @param request - The new name
 */
export async function renameSubgraph(
  projectId: string,
  subgraphSystemId: string,
  request: SetSubgraphNameRequestDto,
): Promise<ApiResult<SubgraphResponseDto>> {
  return httpClient.patch<SubgraphResponseDto>(
    `/projects/${projectId}/subgraphs/${subgraphSystemId}`,
    request,
  );
}

/**
 * Create a data link between two module ports.
 * @param projectId - The unique identifier of the project
 * @param request - The source/destination module and port ids to connect
 * @returns The created link, wrapped in a component collection
 */
export async function createDataLink(
  projectId: string,
  request: CreateDataLinkRequest,
): Promise<LinkOperationResult> {
  return httpClient.post<ComponentCollectionDto>(
    `/projects/${projectId}/data-links`,
    request,
  );
}

/**
 * Create a data link where either endpoint is a subsystem, letting the
 * backend resolve and return every intermediate module/subsystem hop.
 * @param projectId - The unique identifier of the project
 * @param request - The source/destination module and port ids to connect
 * @returns The created link and every intermediate hop, wrapped in a
 * component collection
 */
export async function createDataLinkWithSubsystems(
  projectId: string,
  request: CreateDataLinkRequest,
): Promise<LinkOperationResult> {
  return httpClient.post<ComponentCollectionDto>(
    `/projects/${projectId}/data-links/with-subsystems`,
    request,
  );
}

/**
 * Delete a data link.
 * @param projectId - The unique identifier of the project
 * @param connectionId - The data link's systemId
 * @returns The deleted link's own DTO
 */
export async function deleteDataLink(
  projectId: string,
  connectionId: string,
): Promise<ApiResult<DataLinkDto>> {
  return httpClient.delete<DataLinkDto>(
    `/projects/${projectId}/data-links/${connectionId}`,
  );
}

/**
 * Create a control link between two module ports.
 * @param projectId - The unique identifier of the project
 * @param request - The start/end module and port ids to connect
 * @returns The created link, wrapped in a component collection
 */
export async function createControlLink(
  projectId: string,
  request: CreateControlLinkRequest,
): Promise<LinkOperationResult> {
  return httpClient.post<ComponentCollectionDto>(
    `/projects/${projectId}/control-links`,
    request,
  );
}

/**
 * Create a control link where either endpoint is a subsystem, letting the
 * backend resolve and return every intermediate module/subsystem hop.
 * @param projectId - The unique identifier of the project
 * @param request - The start/end module and port ids to connect
 * @returns The created link and every intermediate hop, wrapped in a
 * component collection
 */
export async function createControlLinkWithSubsystems(
  projectId: string,
  request: CreateControlLinkRequest,
): Promise<LinkOperationResult> {
  return httpClient.post<ComponentCollectionDto>(
    `/projects/${projectId}/control-links/with-subsystems`,
    request,
  );
}

/**
 * Delete a control link.
 * @param projectId - The unique identifier of the project
 * @param connectionId - The control link's systemId
 * @returns The deleted link's own DTO
 */
export async function deleteControlLink(
  projectId: string,
  connectionId: string,
): Promise<ApiResult<ControlLinkDto>> {
  return httpClient.delete<ControlLinkDto>(
    `/projects/${projectId}/control-links/${connectionId}`,
  );
}

/**
 * Batched lookup of modules by systemId
 * @param projectId - The unique identifier of the project
 * @param systemIds - Array of module system identifiers to resolve
 * @returns Array of SpfModuleDto matching the given system IDs
 */
export async function getModulesBySystemIds(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<SpfModuleDto[]>> {
  return httpClient.post<SpfModuleDto[]>(
    `/projects/${projectId}/spf-modules/query`,
    {systemIds},
  );
}
