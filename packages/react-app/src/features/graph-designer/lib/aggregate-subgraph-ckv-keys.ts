/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';

import type {ModuleInstance} from '../model/graph-data-slice';

export interface AggregatedSubgraphCkvKeys {
  isDependent: boolean;
  keyLabels: Record<string, string>;
  keyValues: Record<string, string[]>;
  valueLabels: Record<string, Record<string, string>>;
}

/**
 * Unions the key/value pairs declared across every module's CKVs in a
 * subgraph, and detects whether the CKV set is dependent — i.e. not every
 * combination of key values maps to an existing CKV (WPF parity:
 * `IsDependentCkvs`). `keyValues` remains systemId-keyed since header
 * selection matching (`resolveActiveCkv`) compares against systemIds;
 * `keyLabels`/`valueLabels` carry the display labels for the same systemIds.
 */
export function aggregateSubgraphCkvKeys(
  modules: ModuleInstance[],
): AggregatedSubgraphCkvKeys {
  const seenCkvSystemIds = new Set<string>();
  const uniqueCkvs: CkvDto[] = [];
  for (const module of modules) {
    for (const ckv of module.ckvs ?? []) {
      if (!seenCkvSystemIds.has(ckv.systemId)) {
        seenCkvSystemIds.add(ckv.systemId);
        uniqueCkvs.push(ckv);
      }
    }
  }

  const valuesByKey = new Map<string, Set<string>>();
  const keyLabels: Record<string, string> = {};
  const valueLabels: Record<string, Record<string, string>> = {};
  for (const ckv of uniqueCkvs) {
    for (const {keyInfo, valueInfo} of ckv.keyValueCollection) {
      const values = valuesByKey.get(keyInfo.keySystemId);
      if (values) {
        values.add(valueInfo.valueSystemId);
      } else {
        valuesByKey.set(
          keyInfo.keySystemId,
          new Set([valueInfo.valueSystemId]),
        );
      }
      keyLabels[keyInfo.keySystemId] = keyInfo.keyLabel;
      const labelsForKey = valueLabels[keyInfo.keySystemId];
      if (labelsForKey) {
        labelsForKey[valueInfo.valueSystemId] = valueInfo.valueLabel;
      } else {
        valueLabels[keyInfo.keySystemId] = {
          [valueInfo.valueSystemId]: valueInfo.valueLabel,
        };
      }
    }
  }

  const keyValues: Record<string, string[]> = {};
  let combinationCount = valuesByKey.size > 0 ? 1 : 0;
  for (const [keySystemId, values] of valuesByKey) {
    keyValues[keySystemId] = [...values];
    combinationCount *= values.size;
  }

  return {
    isDependent: combinationCount > uniqueCkvs.length,
    keyLabels,
    keyValues,
    valueLabels,
  };
}
