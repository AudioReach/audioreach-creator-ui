/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {transformVcpmCkvsToConfiguredCkvs} from '~entities/vcpm';
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
