/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {SpfModuleDefinitionResponseDto} from '../model/module-definition.dto';

export async function getSpfModuleDefinition(
  projectId: string,
  moduleSystemId: string,
): Promise<ApiResult<SpfModuleDefinitionResponseDto>> {
  return httpClient.get<SpfModuleDefinitionResponseDto>(
    `/projects/${projectId}/definitions/modules/spf/${moduleSystemId}`,
  );
}
