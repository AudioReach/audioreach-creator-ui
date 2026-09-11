/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the display-only vector filters. Selection and type buttons are
 * independently composable, while search remains key-aware even in Value Only
 * display mode; filtering must not mutate stored vectors or their metadata.
 */
import type {KvSelection} from '~entities/subgraph-definitions';
import {
  getVisibleKvVectors,
  type SubgraphKvFilterState,
} from '~features/key-configurator/subgraph-configurator-view/lib/kv-vector-filter';

function makeVector(
  systemId: string,
  keyName: string,
  valueName: string,
  selected: boolean,
  isEc: boolean,
): KvSelection {
  return {
    isEc,
    keyValuePairs: [
      {
        keyInfo: {keyLabel: keyName},
        valueInfo: {valueLabel: valueName},
      },
    ] as never,
    selected,
    systemId,
  };
}

const allFilters: SubgraphKvFilterState = {
  ec: false,
  regular: true,
  searchText: '',
  selected: true,
  unselected: true,
};

describe('getVisibleKvVectors', () => {
  it('applies every search term, type state, and selection state', () => {
    const vectors = [
      makeVector('unselected', 'DeviceTX', 'A2B_Mic', false, false),
      makeVector('selected', 'DeviceTX', 'A2B_Mic', true, false),
      makeVector('ec', 'DeviceTX', 'A2B_Mic', true, true),
      makeVector('other', 'StreamTX', 'PCM', true, false),
    ];

    expect(
      getVisibleKvVectors(vectors, {...allFilters, searchText: 'device+a2b'}),
    ).toEqual([vectors[1], vectors[0]]);
    expect(
      getVisibleKvVectors(vectors, {...allFilters, unselected: false}),
    ).toEqual([vectors[1], vectors[3]]);
    expect(
      getVisibleKvVectors(vectors, {...allFilters, ec: true, regular: false}),
    ).toEqual([vectors[2]]);
  });

  it('returns no vectors when neither selection filter is enabled', () => {
    const vectors = [
      makeVector('selected', 'DeviceTX', 'A2B_Mic', true, false),
      makeVector('unselected', 'StreamTX', 'PCM_Record', false, false),
    ];

    expect(
      getVisibleKvVectors(vectors, {
        ...allFilters,
        selected: false,
        unselected: false,
      }),
    ).toEqual([]);
  });

  it('includes both types when Regular and EC are enabled', () => {
    const vectors = [
      makeVector('regular', 'DeviceTX', 'A2B_Mic', true, false),
      makeVector('ec', 'StreamTX', 'PCM_Record', false, true),
    ];

    expect(
      getVisibleKvVectors(vectors, {...allFilters, ec: true, regular: true}),
    ).toEqual([vectors[0], vectors[1]]);
  });

  it('returns no vectors when neither type is enabled', () => {
    const vectors = [
      makeVector('regular', 'DeviceTX', 'A2B_Mic', true, false),
      makeVector('ec', 'StreamTX', 'PCM_Record', false, true),
    ];

    expect(
      getVisibleKvVectors(vectors, {...allFilters, ec: false, regular: false}),
    ).toEqual([]);
  });
});
