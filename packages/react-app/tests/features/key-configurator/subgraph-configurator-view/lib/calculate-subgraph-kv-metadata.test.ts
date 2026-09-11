/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the pure SGKV metadata calculation used after graph data is ready.
 * Its input intentionally includes the full usecase catalog plus each
 * usecase's subgraph membership: selected means a vector is a subset of a
 * selected owning usecase, while EC is derived from every owning usecase.
 * Session-owned pair data is not replaced when this metadata is applied.
 */
import {
  applySubgraphKvMetadata,
  calculateSubgraphKvMetadata,
} from '~features/key-configurator/subgraph-configurator-view/lib/calculate-subgraph-kv-metadata';

function vectorPair(keyId: number, valueId: number) {
  return {
    keyInfo: {keyId, keyLabel: `Key ${keyId}`, keySystemId: `key-${keyId}`},
    valueInfo: {
      valueId,
      valueLabel: `Value ${valueId}`,
      valueSystemId: `value-${valueId}`,
    },
  };
}

function usecasePair(keyId: number, valueId: number) {
  return {
    key: {name: `Key ${keyId}`, naturalId: keyId, systemId: `key-${keyId}`},
    value: {
      name: `Value ${valueId}`,
      naturalId: valueId,
      systemId: `value-${valueId}`,
    },
  };
}

describe('calculateSubgraphKvMetadata', () => {
  const firstPair = vectorPair(1, 11);
  const firstUsecasePair = usecasePair(1, 11);
  const secondPair = vectorPair(2, 22);
  const vectorsBySubgraphId = {
    'subgraph-1': [
      {
        isEc: false,
        keyValuePairs: [firstPair],
        selected: false,
        systemId: 'vector-1',
      },
      {
        isEc: false,
        keyValuePairs: [firstPair, secondPair],
        selected: false,
        systemId: 'vector-2',
      },
    ],
  };

  it('selects a vector only when a selected containing usecase includes all pairs', () => {
    expect(
      calculateSubgraphKvMetadata({
        selectedUsecaseIds: ['selected-usecase'],
        usecases: [
          {
            keyValuePairs: [firstUsecasePair],
            subgraphSystemIds: ['subgraph-1'],
            systemId: 'selected-usecase',
            usecaseType: 'LINKED',
          },
        ],
        vectorsBySubgraphId,
      }),
    ).toEqual({
      'subgraph-1': {
        'vector-1': {isEc: false, selected: true},
        'vector-2': {isEc: false, selected: false},
      },
    });
  });

  it('uses every containing usecase for EC classification', () => {
    expect(
      calculateSubgraphKvMetadata({
        selectedUsecaseIds: [],
        usecases: [
          {
            keyValuePairs: [firstUsecasePair],
            subgraphSystemIds: ['subgraph-1'],
            systemId: 'ec-usecase',
            usecaseType: 'EC',
          },
          {
            keyValuePairs: [firstUsecasePair],
            subgraphSystemIds: ['other-subgraph'],
            systemId: 'unrelated-regular-usecase',
            usecaseType: 'LINKED',
          },
        ],
        vectorsBySubgraphId,
      }),
    ).toEqual({
      'subgraph-1': {
        'vector-1': {isEc: true, selected: false},
        'vector-2': {isEc: false, selected: false},
      },
    });
  });

  it('does not auto-select a palette-placed subgraph', () => {
    expect(
      calculateSubgraphKvMetadata({
        palettePlacedSubgraphIds: ['subgraph-1'],
        selectedUsecaseIds: ['selected-usecase'],
        usecases: [
          {
            keyValuePairs: [firstUsecasePair],
            subgraphSystemIds: ['subgraph-1'],
            systemId: 'selected-usecase',
            usecaseType: 'LINKED',
          },
        ],
        vectorsBySubgraphId,
      }),
    ).toEqual({
      'subgraph-1': {
        'vector-1': {isEc: false, selected: false},
        'vector-2': {isEc: false, selected: false},
      },
    });
  });

  it('overlays metadata without changing vector identity or pairs', () => {
    const metadata = {
      'subgraph-1': {
        'vector-1': {isEc: true, selected: true},
      },
    };

    expect(
      applySubgraphKvMetadata(vectorsBySubgraphId, metadata)['subgraph-1'][0],
    ).toEqual({
      ...vectorsBySubgraphId['subgraph-1'][0],
      isEc: true,
      selected: true,
    });
  });
});
