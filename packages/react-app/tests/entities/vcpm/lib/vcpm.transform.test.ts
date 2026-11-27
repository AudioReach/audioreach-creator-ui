/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  transformVcpmCkvsToConfiguredCkvs,
  transformVcpmConfiguredParamsToConfiguredCkvs,
} from '~entities/vcpm';
import type {GraphKey} from '~shared/types/key-configurator-config.types';

describe('transformVcpmCkvsToConfiguredCkvs', () => {
  it('maps VcpmCkvDto to ConfiguredCkv with no supported parameters', () => {
    const keyDefinitionsByNaturalId: Record<number, GraphKey> = {
      1: {id: 1, name: 'Key1', systemId: 'k1', values: []},
    };
    const result = transformVcpmCkvsToConfiguredCkvs(
      [
        {
          keyValuePairs: [
            {
              key: {name: 'Key1', naturalId: 1, systemId: 'k1'},
              value: {name: 'Val1', naturalId: 2, systemId: 'v1'},
            },
          ],
          systemId: 'ckv-1',
        },
      ],
      keyDefinitionsByNaturalId,
    );
    expect(result).toHaveLength(1);
    expect(result[0].systemId).toBe('ckv-1');
    expect(result[0].keyValuePairs[0].key.systemId).toBe('k1');
  });
});

describe('transformVcpmConfiguredParamsToConfiguredCkvs', () => {
  const keyDefinitionsByNaturalId: Record<number, GraphKey> = {
    1: {id: 1, name: 'Key1', systemId: 'k1', values: []},
  };
  const keyValuePairs = [
    {
      key: {name: 'Key1', naturalId: 1, systemId: 'k1'},
      value: {name: 'Val1', naturalId: 2, systemId: 'v1'},
    },
  ];

  it('dedupes a ckvSystemId that repeats across multiple parameters', () => {
    const result = transformVcpmConfiguredParamsToConfiguredCkvs(
      [
        {
          associatedCkvs: [{ckv: keyValuePairs, ckvSystemId: 'ckv-1'}],
          paramName: 'Param A',
          paramSystemId: 'p-1',
        },
        {
          associatedCkvs: [{ckv: keyValuePairs, ckvSystemId: 'ckv-1'}],
          paramName: 'Param B',
          paramSystemId: 'p-2',
        },
      ],
      keyDefinitionsByNaturalId,
    );
    expect(result).toHaveLength(1);
    expect(result[0].systemId).toBe('ckv-1');
    expect(result[0].keyValuePairs[0].key.systemId).toBe('k1');
  });

  it('returns an empty list when there are no configured parameters', () => {
    const result = transformVcpmConfiguredParamsToConfiguredCkvs(
      [],
      keyDefinitionsByNaturalId,
    );
    expect(result).toEqual([]);
  });
});
