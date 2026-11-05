/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ParamDefinitionsSummaryInfo,
  SpfModuleDefinitionResponseDto,
} from '~entities/module-definitions/model/module-definition.dto';

import type {TkvParameter} from './module-tag-keys-config.types';

export function transformParamDefinitionsToTKVParameters(
  paramDefinitions: ParamDefinitionsSummaryInfo[],
): TkvParameter[] {
  return paramDefinitions.map((paramDef) => ({
    checked: false,
    name: paramDef.name,
    pid: paramDef.naturalId,
  }));
}

export function transformModuleDefinitionToTKVParameters(
  moduleDefinition: SpfModuleDefinitionResponseDto,
): TkvParameter[] {
  return transformParamDefinitionsToTKVParameters(
    moduleDefinition.paramDefinitionsSummaryInfo,
  );
}
