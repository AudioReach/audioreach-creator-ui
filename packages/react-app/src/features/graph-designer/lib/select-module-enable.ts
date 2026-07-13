/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {GraphDesignerStore} from '../model/graph-designer-store';

import {resolveEnableParamSystemId} from './module-enable.constants';
import {selectActiveCkvForModule} from './select-active-ckv-for-module';

export type ModuleEnable =
  | {isPresent: false}
  | {isCkvResolved: false; isPresent: true}
  | {isCkvResolved: true; isPresent: true; isReady: false}
  | {isCkvResolved: true; isPresent: true; isReady: true; value: boolean};

function isEnableAllowedValue(value: string): boolean {
  return value.toLowerCase() === 'enable';
}

/**
 * Derives the canvas enable-switch state for a module instance, per
 * design.md §21.4/§21.5: absent when the module has no
 * `PARAM_ID_MODULE_ENABLE` parameter, unresolved-CKV when the module's
 * active CKV can't be determined from the current subgraph header
 * selection, not-ready while the enable item hasn't been fetched into
 * `calData` yet, and ready with a decoded boolean once it has.
 */
export function selectModuleEnable(
  state: GraphDesignerStore,
  moduleInstanceId: string,
): ModuleEnable {
  const moduleInstance = state.graphData?.moduleInstances[moduleInstanceId];
  const moduleDefinition = moduleInstance
    ? state.moduleDefinitionsById[moduleInstance.moduleId]
    : undefined;
  const enableSystemId = resolveEnableParamSystemId(moduleDefinition);
  if (!enableSystemId) {
    return {isPresent: false};
  }

  const activeCkv = selectActiveCkvForModule(state, moduleInstanceId);
  if (!activeCkv.isResolved) {
    return {isCkvResolved: false, isPresent: true};
  }

  const calData = state.moduleDataByModuleId[moduleInstanceId]?.calData;
  if (calData?.selectedCalIndex !== activeCkv.ckvSystemId) {
    return {isCkvResolved: true, isPresent: true, isReady: false};
  }

  const enableParameter = calData.dto?.parameters.find(
    (param) => param.systemId === enableSystemId,
  );
  const enableElement = enableParameter?.elements[0];
  if (!enableElement || enableElement.type !== 'CONFIG_ELEMENT') {
    return {isCkvResolved: true, isPresent: true, isReady: false};
  }

  const activeAllowedValue = enableElement.allowedValues?.find(
    (allowedValue) =>
      allowedValue.type === 'NAME_VALUE_PAIR' &&
      allowedValue.value === enableElement.value,
  );

  return {
    isCkvResolved: true,
    isPresent: true,
    isReady: true,
    value: activeAllowedValue
      ? isEnableAllowedValue(activeAllowedValue.name)
      : false,
  };
}
