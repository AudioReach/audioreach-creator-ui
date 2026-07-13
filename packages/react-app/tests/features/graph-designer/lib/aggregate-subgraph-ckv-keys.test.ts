/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';
import {aggregateSubgraphCkvKeys} from '~features/graph-designer/lib/aggregate-subgraph-ckv-keys';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';

function makeCkv(systemId: string, keyValues: [string, string][]): CkvDto {
  return {
    keyValueCollection: keyValues.map(([keySystemId, valueSystemId]) => ({
      keyInfo: {keyId: 0, keyLabel: keySystemId, keySystemId},
      valueInfo: {valueId: 0, valueLabel: valueSystemId, valueSystemId},
    })),
    supportedParameters: [],
    systemId,
  };
}

function makeModule(ckvs: CkvDto[]): ModuleInstance {
  return {
    ckvs,
    containerId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'mod-1',
    moduleInstanceId: 'inst-1',
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphId: 'sg-1',
  };
}

describe('aggregateSubgraphCkvKeys', () => {
  it('unions the key/value pairs seen across all modules', () => {
    const modules = [
      makeModule([
        makeCkv('ckv-1', [
          ['key-1', 'v1'],
          ['key-2', 'va'],
        ]),
      ]),
      makeModule([
        makeCkv('ckv-2', [
          ['key-1', 'v2'],
          ['key-2', 'vb'],
        ]),
      ]),
    ];

    const result = aggregateSubgraphCkvKeys(modules);

    expect(result.keyValues).toEqual({
      'key-1': ['v1', 'v2'],
      'key-2': ['va', 'vb'],
    });
  });

  it('is not dependent when every key/value combination has a matching CKV', () => {
    const modules = [
      makeModule([
        makeCkv('ckv-1', [
          ['key-1', 'v1'],
          ['key-2', 'va'],
        ]),
        makeCkv('ckv-2', [
          ['key-1', 'v1'],
          ['key-2', 'vb'],
        ]),
        makeCkv('ckv-3', [
          ['key-1', 'v2'],
          ['key-2', 'va'],
        ]),
        makeCkv('ckv-4', [
          ['key-1', 'v2'],
          ['key-2', 'vb'],
        ]),
      ]),
    ];

    const result = aggregateSubgraphCkvKeys(modules);

    expect(result.isDependent).toBe(false);
  });

  it('is dependent when a key value is only available for a subset of other-key selections', () => {
    const modules = [
      makeModule([
        makeCkv('ckv-1', [
          ['key-1', 'v1'],
          ['key-2', 'va'],
        ]),
        makeCkv('ckv-2', [
          ['key-1', 'v2'],
          ['key-2', 'vb'],
        ]),
      ]),
    ];

    const result = aggregateSubgraphCkvKeys(modules);

    expect(result.isDependent).toBe(true);
  });

  it('deduplicates identical CKVs shared across modules', () => {
    const sharedCkv = makeCkv('ckv-1', [['key-1', 'v1']]);
    const modules = [makeModule([sharedCkv]), makeModule([sharedCkv])];

    const result = aggregateSubgraphCkvKeys(modules);

    expect(result.keyValues).toEqual({'key-1': ['v1']});
    expect(result.isDependent).toBe(false);
  });

  it('returns empty keyValues and isDependent false when no modules have CKVs', () => {
    const modules = [makeModule([])];

    const result = aggregateSubgraphCkvKeys(modules);

    expect(result.keyValues).toEqual({});
    expect(result.isDependent).toBe(false);
  });

  it('collects display labels keyed by systemId, distinct from the systemIds themselves', () => {
    const ckv: CkvDto = {
      keyValueCollection: [
        {
          keyInfo: {keyId: 0, keyLabel: 'Sample Rate', keySystemId: 'key-1'},
          valueInfo: {valueId: 0, valueLabel: '48 kHz', valueSystemId: 'v1'},
        },
      ],
      supportedParameters: [],
      systemId: 'ckv-1',
    };
    const modules = [makeModule([ckv])];

    const result = aggregateSubgraphCkvKeys(modules);

    expect(result.keyLabels).toEqual({'key-1': 'Sample Rate'});
    expect(result.valueLabels).toEqual({'key-1': {v1: '48 kHz'}});
  });
});
