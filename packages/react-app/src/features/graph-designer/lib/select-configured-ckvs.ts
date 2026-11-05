/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  buildKeyDefinitionLookup,
  transformCkvsToConfiguredCkvs,
} from '~entities/key-configurator/lib/ckv.transform';
import type {ConfiguredCkv} from '~shared/types/key-configurator-config.types';

import type {GraphDesignerStore} from '../model/graph-designer-store';

export function selectConfiguredCkvs(
  state: Pick<GraphDesignerStore, 'calibrationKeys' | 'graphData'>,
  instanceSystemId: string,
): ConfiguredCkv[] {
  const moduleInstance = state.graphData?.moduleInstances[instanceSystemId];
  if (!moduleInstance?.ckvs) {
    return [];
  }
  const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
    state.calibrationKeys,
  );
  return transformCkvsToConfiguredCkvs(
    moduleInstance.ckvs,
    keyDefinitionsByNaturalId,
  );
}
