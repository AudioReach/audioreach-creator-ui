/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions';

export const PARAM_ID_MODULE_ENABLE = 0x8001026;

/**
 * Resolves the enable parameter's backend-assigned systemId from a module
 * definition by matching on the numeric `PARAM_ID_MODULE_ENABLE` PID,
 * rather than assuming a fixed systemId string — the systemId a backend
 * assigns to a given PID is not guaranteed to be stable across deployments.
 */
export function resolveEnableParamSystemId(
  definition: SpfModuleDefinitionResponseDto | undefined,
): string | undefined {
  return definition?.paramDefinitionsSummaryInfo.find(
    (param) => param.paramId === PARAM_ID_MODULE_ENABLE,
  )?.systemId;
}
