/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SessionResponseDto} from '~entities/project';
import {type ApiResult, httpClient} from '~shared/api';

import type {
  CommitChangesRequestDto,
  CommitChangesResponseDto,
} from '../model/commit-changes.dto';
import type {
  CreateUsecasesRequestDto,
  CreateUsecasesResponseDto,
} from '../model/create-usecases.dto';
import type {
  DiscardChangesRequestDto,
  DiscardChangesResponseDto,
} from '../model/discard-changes.dto';
import type {
  StageChangesRequestDto,
  StageChangesResponseDto,
} from '../model/stage-changes.dto';

/**
 * Create usecases for a project.
 * @param projectId - The unique identifier of the project
 * @param body - Request body with activeSubgraphs and selectedUsecaseSystemIds
 * @returns Response with created, updated, and deleted usecases
 */
export async function createUsecases(
  projectId: string,
  body: CreateUsecasesRequestDto,
): Promise<ApiResult<CreateUsecasesResponseDto>> {
  return httpClient.post<CreateUsecasesResponseDto>(
    `/projects/${projectId}/create-usecases`,
    body,
  );
}

/**
 * Stage changes for a project.
 * @param projectId - The unique identifier of the project
 * @param changeIds - Array of change identifiers to stage
 * @returns Response with processed and failed change IDs
 */
export async function stageChanges(
  projectId: string,
  changeIds: string[],
): Promise<ApiResult<StageChangesResponseDto>> {
  return httpClient.post<StageChangesResponseDto>(
    `/projects/${projectId}/stage-changes`,
    {changeIds} satisfies StageChangesRequestDto,
  );
}

/**
 * Commit changes for a project.
 * When changeIds is omitted, all staged changes are committed.
 * @param projectId - The unique identifier of the project
 * @param changeIds - Optional array of change identifiers to commit
 * @param enforceValidation - Whether to enforce validation (default: false)
 * @returns Response with processed and failed change IDs
 */
export async function commitChanges(
  projectId: string,
  changeIds?: string[],
  enforceValidation = false,
): Promise<ApiResult<CommitChangesResponseDto>> {
  const query = enforceValidation ? '?enforceValidation=true' : '';
  return httpClient.post<CommitChangesResponseDto>(
    `/projects/${projectId}/commit-changes${query}`,
    {changeIds} satisfies CommitChangesRequestDto,
  );
}

/**
 * Discard changes for a project.
 * When changeIds is omitted, all staged changes are discarded.
 * @param projectId - The unique identifier of the project
 * @param changeIds - Optional array of change identifiers to discard
 * @returns Response with processed, failed, and cascaded change IDs
 */
export async function discardChanges(
  projectId: string,
  changeIds?: string[],
): Promise<ApiResult<DiscardChangesResponseDto>> {
  return httpClient.post<DiscardChangesResponseDto>(
    `/projects/${projectId}/discard-changes`,
    {changeIds} satisfies DiscardChangesRequestDto,
  );
}

/**
 * End the edit session for a project.
 * @param projectId - The unique identifier of the project
 * @returns Session response with project ID and session mode
 */
export async function endSession(
  projectId: string,
): Promise<ApiResult<SessionResponseDto>> {
  return httpClient.post<SessionResponseDto>(
    `/projects/${projectId}/end-session`,
  );
}
