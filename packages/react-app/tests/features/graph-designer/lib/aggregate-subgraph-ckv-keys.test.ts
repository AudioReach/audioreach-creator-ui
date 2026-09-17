/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';
import {aggregateSubgraphCkvKeys} from '~features/graph-designer/lib/aggregate-subgraph-ckv-keys';
import type {ModuleInstance} from '~features/graph-designer/model/graph-data-slice';

function makeCkv(systemId: string, keyValues: [string, string][]): CkvDto {
  return {
    keyValuePairs: keyValues.map(([keySystemId, valueSystemId]) => ({
      key: {name: keySystemId, naturalId: 0, systemId: keySystemId},
      value: {name: valueSystemId, naturalId: 0, systemId: valueSystemId},
    })),
    supportedParameters: [],
    systemId,
  };
}

function makeModule(ckvs: CkvDto[]): ModuleInstance {
  return {
    ckvs,
    containerSystemId: 'cnt-1',
    displayName: 'Module',
    inputPorts: [],
    moduleId: 'mod-1',
    moduleName: 'Module',
    moduleType: '',
    outputPorts: [],
    position: {x: 0, y: 0},
    subgraphSystemId: 'sg-1',
    systemId: 'inst-1',
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
      keyValuePairs: [
        {
          key: {name: 'Sample Rate', naturalId: 0, systemId: 'key-1'},
          value: {name: '48 kHz', naturalId: 0, systemId: 'v1'},
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
