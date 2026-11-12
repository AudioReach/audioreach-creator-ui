/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SessionMode, SessionResponseDto} from '~entities/project';
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
  StageUsecasesRequestDto,
  StageUsecasesResponseDto,
} from '../model/stage-usecases.dto';

export async function createUsecases(
  projectId: string,
  body: CreateUsecasesRequestDto,
): Promise<ApiResult<CreateUsecasesResponseDto>> {
  return httpClient.post<CreateUsecasesResponseDto>(
    `/projects/${projectId}/create-usecases`,
    body,
  );
}

export async function stageUsecases(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<StageUsecasesResponseDto>> {
  return httpClient.post<StageUsecasesResponseDto>(
    `/projects/${projectId}/stage-usecases`,
    {systemIds} satisfies StageUsecasesRequestDto,
  );
}

/** Commits every staged change in the session; selective commit isn't supported. */
export async function commitChanges(
  projectId: string,
  enforceValidation = false,
): Promise<ApiResult<CommitChangesResponseDto>> {
  const query = enforceValidation ? '?enforceValidation=true' : '';
  return httpClient.post<CommitChangesResponseDto>(
    `/projects/${projectId}/commit-changes${query}`,
    {} satisfies CommitChangesRequestDto,
  );
}

/** Omitting `changeIds` discards all staged changes. */
export async function discardChanges(
  projectId: string,
  changeIds?: string[],
): Promise<ApiResult<DiscardChangesResponseDto>> {
  return httpClient.post<DiscardChangesResponseDto>(
    `/projects/${projectId}/discard-changes`,
    {changeIds} satisfies DiscardChangesRequestDto,
  );
}

export async function endSession(
  projectId: string,
): Promise<ApiResult<SessionResponseDto>> {
  return httpClient.post<SessionResponseDto>(
    `/projects/${projectId}/end-session`,
  );
}

export async function startSession(
  projectId: string,
  mode: SessionMode,
): Promise<ApiResult<SessionResponseDto>> {
  return httpClient.post<SessionResponseDto>(
    `/projects/${projectId}/start-session`,
    {mode},
  );
}
