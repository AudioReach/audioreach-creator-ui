/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SpfModuleResponseDto} from '~entities/spf-modules/model/spf-module-crud.dto';
import {
  type ApiResult,
  createCommaSeparatedQueryParam,
  httpClient,
} from '~shared/api';

import type {ModuleInstanceTuningConfigDto} from '../model/module-instance-config.dto';

function toModuleInstanceTuningConfig(
  module: SpfModuleResponseDto,
): ModuleInstanceTuningConfigDto {
  return {
    ckvs: module.ckvs ?? [],
    moduleInstanceSystemId: module.systemId,
    tags: (module.tags ?? []).map((tag) => ({
      ...tag,
      tkvs: tag.tkvs ?? [],
    })),
  };
}

export async function getModuleInstanceTuningConfig(
  projectId: string,
  moduleSystemIds: string[],
): Promise<ApiResult<ModuleInstanceTuningConfigDto[]>> {
  const systemIdParam = createCommaSeparatedQueryParam(
    'systemId',
    moduleSystemIds,
  );
  const params = [systemIdParam, 'include=ckvs,tags'].filter(Boolean).join('&');
  const result = await httpClient.get<SpfModuleResponseDto[]>(
    `/projects/${projectId}/spf-modules?${params}`,
  );

  const {data, ...rest} = result;

  return {
    ...rest,
    data: data?.map(toModuleInstanceTuningConfig),
  };
}
