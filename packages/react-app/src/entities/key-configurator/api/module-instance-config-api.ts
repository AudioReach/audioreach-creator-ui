/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ApiResult, httpClient} from '~shared/api';

import type {SpfModuleDefinitionResponseDto} from '../../module-definitions/model/module-definition.dto';
import type {ModuleInstanceTuningConfigDto} from '../model/module-instance-config.dto';

export async function getModuleInstanceTuningConfig(
  projectId: string,
  moduleSystemId: string,
): Promise<ApiResult<ModuleInstanceTuningConfigDto>> {
  return httpClient.get<ModuleInstanceTuningConfigDto>(
    `/projects/${projectId}/module-instance/${moduleSystemId}/tuning-config`,
  );
}

export async function getSpfModuleDefinition(
  projectId: string,
  moduleSystemId: string,
): Promise<ApiResult<SpfModuleDefinitionResponseDto>> {
  return httpClient.get<SpfModuleDefinitionResponseDto>(
    `/projects/${projectId}/definitions/modules/spf/${moduleSystemId}`,
  );
}
