/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {GraphDesignerStore} from '../model/graph-designer-store';

import {resolveActiveCkv, type ResolvedCkv} from './resolve-active-ckv';

/**
 * Resolves the active CKV for a module instance against its subgraph's
 * current header selection. Unresolved when the module instance can't be
 * found, its subgraph has no header selection yet, or no CKV matches.
 */
export function selectActiveCkvForModule(
  state: GraphDesignerStore,
  moduleInstanceId: string,
): ResolvedCkv {
  const moduleInstance = state.graphData?.moduleInstances[moduleInstanceId];
  if (!moduleInstance) {
    return {isResolved: false};
  }

  const headerSelection =
    state.headerSelectionsBySubgraphId[moduleInstance.subgraphId];
  if (!headerSelection) {
    return {isResolved: false};
  }

  return resolveActiveCkv(moduleInstance.ckvs ?? [], headerSelection.keyValues);
}
