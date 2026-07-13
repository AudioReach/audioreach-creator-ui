/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';
import {resolveActiveCkv} from '~features/graph-designer/lib/resolve-active-ckv';

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

describe('resolveActiveCkv', () => {
  it('returns the matching CKV systemId when the selection covers all its keys', () => {
    const moduleCkvs = [
      makeCkv('ckv-1', [
        ['key-1', 'v1'],
        ['key-2', 'va'],
      ]),
      makeCkv('ckv-2', [
        ['key-1', 'v2'],
        ['key-2', 'vb'],
      ]),
    ];

    const result = resolveActiveCkv(moduleCkvs, {
      'key-1': 'v2',
      'key-2': 'vb',
    });

    expect(result).toEqual({ckvSystemId: 'ckv-2', isResolved: true});
  });

  it('returns unresolved when no CKV matches the given selection', () => {
    const moduleCkvs = [
      makeCkv('ckv-1', [
        ['key-1', 'v1'],
        ['key-2', 'va'],
      ]),
    ];

    const result = resolveActiveCkv(moduleCkvs, {
      'key-1': 'v9',
      'key-2': 'va',
    });

    expect(result).toEqual({isResolved: false});
  });

  it('never matches when the selection contains the NA sentinel', () => {
    const moduleCkvs = [makeCkv('ckv-1', [['key-1', 'v1']])];

    const result = resolveActiveCkv(moduleCkvs, {'key-1': 'NA'});

    expect(result).toEqual({isResolved: false});
  });

  it('returns unresolved when moduleCkvs is empty', () => {
    const result = resolveActiveCkv([], {'key-1': 'v1'});

    expect(result).toEqual({isResolved: false});
  });
});
