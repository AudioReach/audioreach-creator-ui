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

export async function createUsecases(
  projectId: string,
  body: CreateUsecasesRequestDto,
): Promise<ApiResult<CreateUsecasesResponseDto>> {
  return httpClient.post<CreateUsecasesResponseDto>(
    `/projects/${projectId}/create-usecases`,
    body,
  );
}

export async function stageChanges(
  projectId: string,
  changeIds: string[],
): Promise<ApiResult<StageChangesResponseDto>> {
  return httpClient.post<StageChangesResponseDto>(
    `/projects/${projectId}/stage-changes`,
    {changeIds} satisfies StageChangesRequestDto,
  );
}

/** Omitting `changeIds` commits all staged changes. */
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
