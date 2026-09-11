/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Verifies conversion from backend SGKV transport objects to UI-owned vectors.
 * It also locks the unordered key/value-pair identity used for duplicate
 * detection, so formatting or backend pair order cannot create duplicates.
 */
import type {SubgraphKvVectorDto} from '~entities/subgraph-definitions';
import {
  areKvVectorsEqual,
  getKvVectorSignature,
  mapSubgraphKvVectors,
} from '~features/graph-designer/lib/subgraph-kv-mapping';

const vectorDto: SubgraphKvVectorDto = {
  keyValuePairs: [
    {
      key: {name: 'DeviceTX', naturalId: 1, systemId: 'key-device-tx'},
      value: {name: 'A2B_Mic', naturalId: 10, systemId: 'value-a2b-mic'},
    },
    {
      key: {name: 'StreamTX', naturalId: 2, systemId: 'key-stream-tx'},
      value: {
        name: 'PCM_ULL_Record',
        naturalId: 20,
        systemId: 'value-pcm-ull-record',
      },
    },
  ],
  systemId: 'sgkv-1',
};

describe('mapSubgraphKvVectors', () => {
  it('preserves vector, key, and value system IDs', () => {
    const [vector] = mapSubgraphKvVectors([vectorDto]);

    expect(vector).toMatchObject({
      isEc: false,
      selected: false,
      systemId: 'sgkv-1',
    });
    expect(vector.keyValuePairs).toHaveLength(2);
    expect(vector.keyValuePairs[0]?.keyInfo.keySystemId).toBe('key-device-tx');
    expect(vector.keyValuePairs[0]?.valueInfo.valueSystemId).toBe(
      'value-a2b-mic',
    );
  });
});

describe('getKvVectorSignature', () => {
  it('returns the same signature when pair order differs', () => {
    const [vector] = mapSubgraphKvVectors([vectorDto]);

    expect(getKvVectorSignature(vector.keyValuePairs)).toBe(
      getKvVectorSignature([...vector.keyValuePairs].reverse()),
    );
  });
});

describe('areKvVectorsEqual', () => {
  it('treats vectors with differently ordered pairs as equal', () => {
    const [vector] = mapSubgraphKvVectors([vectorDto]);

    expect(
      areKvVectorsEqual(
        vector.keyValuePairs,
        [...vector.keyValuePairs].reverse(),
      ),
    ).toBe(true);
  });
});
