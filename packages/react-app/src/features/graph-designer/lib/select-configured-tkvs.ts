/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  buildTagDefinitionLookup,
  transformTagsToConfiguredTkvs,
} from '~entities/key-configurator/lib/tkv.transform';
import type {ConfiguredTkv} from '~shared/types/key-configurator-config.types';

import type {GraphDesignerStore} from '../model/graph-designer-store';

export function selectConfiguredTkvs(
  state: Pick<GraphDesignerStore, 'graphData' | 'moduleTagKeys'>,
  instanceSystemId: string,
): ConfiguredTkv[] {
  const tags = state.graphData?.moduleInstances[instanceSystemId]?.tags;
  if (!tags) {
    return [];
  }
  return transformTagsToConfiguredTkvs(
    tags,
    buildTagDefinitionLookup(state.moduleTagKeys),
  );
}
