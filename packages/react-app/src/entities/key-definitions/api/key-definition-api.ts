/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {
  KeyDefinitionResponseDto,
  TagDefinitionResponseDto,
} from '../model/key-definition.dto';

export async function getAllKeyDefinitions(
  projectId: string,
): Promise<ApiResult<KeyDefinitionResponseDto[]>> {
  return httpClient.get<KeyDefinitionResponseDto[]>(
    `/projects/${projectId}/definitions/keys`,
  );
}

export async function getAllTagDefinitions(
  projectId: string,
): Promise<ApiResult<TagDefinitionResponseDto[]>> {
  return httpClient.get<TagDefinitionResponseDto[]>(
    `/projects/${projectId}/definitions/tags`,
  );
}
