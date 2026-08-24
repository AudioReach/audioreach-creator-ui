/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {
  CreateSubsystemRequestDto,
  CreateSubsystemResponseDto,
  DeleteSubsystemResponseDto,
  MoveSubsystemComponentsRequestDto,
  MoveSubsystemComponentsResponseDto,
  NormalizedMoveSubsystemComponentsResponseDto,
  PatchSubsystemRequestDto,
  UpdateSubsystemResponseDto,
} from '../model/subsystem-crud.dto';

function normalizeMoveSubsystemComponentsResponse(
  response: MoveSubsystemComponentsResponseDto,
): NormalizedMoveSubsystemComponentsResponseDto {
  return {
    addedControlLinks: response.addedControlLinks ?? [],
    addedDataLinks: response.addedDataLinks ?? [],
    removedControlLinks: response.removedControlLinks ?? [],
    removedDataLinks: response.removedDataLinks ?? [],
    subsystemPortChanges: (response.subsystemPortChanges ?? []).map(
      (change) => ({
        addedControlPorts: change.addedControlPorts ?? [],
        addedDataPorts: change.addedDataPorts ?? [],
        removedControlPorts: change.removedControlPorts ?? [],
        removedDataPorts: change.removedDataPorts ?? [],
        systemId: change.systemId,
      }),
    ),
    updatedModules: response.updatedModules ?? [],
    updatedSubsystems: response.updatedSubsystems ?? [],
  };
}

/**
 * Create a new subsystem shell (no components yet).
 * @param projectId - The unique identifier of the project
 * @param request - Subsystem name and optional parent subsystem id
 */
export async function createSubsystem(
  projectId: string,
  request: CreateSubsystemRequestDto,
): Promise<ApiResult<CreateSubsystemResponseDto>> {
  return httpClient.post<CreateSubsystemResponseDto>(
    `/projects/${projectId}/subsystems`,
    request,
  );
}

/**
 * Delete a subsystem. Backend rejects (returns success: false) unless the
 * subsystem is already empty, no cascade.
 * @param projectId - The unique identifier of the project
 * @param subsystemSystemId - The subsystem's systemId
 */
export async function deleteSubsystem(
  projectId: string,
  subsystemSystemId: string,
): Promise<ApiResult<DeleteSubsystemResponseDto>> {
  return httpClient.delete<DeleteSubsystemResponseDto>(
    `/projects/${projectId}/subsystems/${subsystemSystemId}`,
  );
}

/**
 * Move one or more components (subgraphs or subsystems) to a target
 * subsystem, or to root when targetSubsystemSystemId is null.
 * @param projectId - The unique identifier of the project
 * @param request - Moved component ids and target subsystem id/null
 */
export async function moveSubsystemComponents(
  projectId: string,
  request: MoveSubsystemComponentsRequestDto,
): Promise<ApiResult<NormalizedMoveSubsystemComponentsResponseDto>> {
  const result = await httpClient.post<MoveSubsystemComponentsResponseDto>(
    `/projects/${projectId}/subsystems/components/move`,
    request,
  );
  if (result.success && result.data) {
    return {
      ...result,
      data: normalizeMoveSubsystemComponentsResponse(result.data),
    };
  }

  return {
    errors: result.errors,
    message: result.message,
    success: result.success,
    warnings: result.warnings,
  };
}

/**
 * Patch a subsystem's name or port-count fields.
 * @param projectId - The unique identifier of the project
 * @param subsystemSystemId - The subsystem's systemId
 * @param request - Partial patch payload; only provided fields are updated
 */
export async function patchSubsystem(
  projectId: string,
  subsystemSystemId: string,
  request: PatchSubsystemRequestDto,
): Promise<ApiResult<UpdateSubsystemResponseDto>> {
  return httpClient.patch<UpdateSubsystemResponseDto>(
    `/projects/${projectId}/subsystems/${subsystemSystemId}`,
    request,
  );
}
