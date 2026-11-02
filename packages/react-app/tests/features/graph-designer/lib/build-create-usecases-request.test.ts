/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Verifies the Apply payload boundary for staged SGKV changes. Only selected
 * vectors become `activeSubgraphs` value-system-ID lists; display labels and
 * unselected vectors must never leak into the backend request.
 */
import type {KvSelection, SubgraphKvPair} from '~entities/subgraph-definitions';
import {buildCreateUsecasesRequest} from '~features/graph-designer/lib/build-create-usecases-request';
import type {Connection} from '~features/graph-designer/model/graph-data-slice';

function makeKeyValue(id: number, valueSystemId: string): SubgraphKvPair {
  return {
    keyInfo: {keyId: id, keyLabel: `key${id}`, keySystemId: `ks${id}`},
    valueInfo: {valueId: id, valueLabel: `value${id}`, valueSystemId},
  };
}

function makeConnection(
  systemId: string,
  linkKind: 'control' | 'data',
): Connection {
  return {
    destinationPortSystemId: `${systemId}-dp`,
    destinationSystemId: `${systemId}-d`,
    linkKind,
    linkType: 'NORMAL',
    sourcePortSystemId: `${systemId}-sp`,
    sourceSystemId: `${systemId}-s`,
    systemId,
  };
}

describe('buildCreateUsecasesRequest', () => {
  it('returns empty inputs unchanged with empty included-* arrays', () => {
    const result = buildCreateUsecasesRequest({
      allLinks: [],
      excludedLinks: [],
      kvSelectionsById: {},
      usecaseSystemIds: [],
    });

    expect(result.usecaseSystemIds).toEqual([]);
    expect(result.activeSubgraphs).toEqual([]);
    expect(result.includedDataLinkSystemIds).toEqual([]);
    expect(result.includedControlLinkSystemIds).toEqual([]);
  });

  it('filters unselected KV entries and maps to valueSystemIds', () => {
    const kv1 = makeKeyValue(1, 'vs1');
    const kv2 = makeKeyValue(2, 'vs2');
    const kv3 = makeKeyValue(3, 'vs3');

    const kvSelectionsById: Record<string, KvSelection[]> = {
      sg1: [
        {
          isEc: false,
          keyValuePairs: [kv1, kv2],
          selected: true,
          systemId: 'sel1',
        },
        {
          isEc: false,
          keyValuePairs: [kv3],
          selected: false,
          systemId: 'sel2',
        },
      ],
    };

    const result = buildCreateUsecasesRequest({
      allLinks: [],
      excludedLinks: [],
      kvSelectionsById,
      usecaseSystemIds: ['uc1'],
    });

    expect(result.activeSubgraphs).toHaveLength(1);
    expect(result.activeSubgraphs[0]).toEqual({
      systemId: 'sg1',
      valueSystemIds: [['vs1', 'vs2']],
    });
  });

  it('includes subgraph with empty valueSystemIds when all entries unselected', () => {
    const kv1 = makeKeyValue(1, 'vs1');

    const kvSelectionsById: Record<string, KvSelection[]> = {
      sg1: [
        {
          isEc: false,
          keyValuePairs: [kv1],
          selected: false,
          systemId: 'sel1',
        },
      ],
    };

    const result = buildCreateUsecasesRequest({
      allLinks: [],
      excludedLinks: [],
      kvSelectionsById,
      usecaseSystemIds: [],
    });

    expect(result.activeSubgraphs).toHaveLength(1);
    expect(result.activeSubgraphs[0]).toEqual({
      systemId: 'sg1',
      valueSystemIds: [],
    });
  });

  it('partitions all non-excluded links into included data and control arrays', () => {
    const allLinks: Connection[] = [
      makeConnection('conn1', 'data'),
      makeConnection('conn2', 'control'),
      makeConnection('conn3', 'data'),
    ];

    const result = buildCreateUsecasesRequest({
      allLinks,
      excludedLinks: [],
      kvSelectionsById: {},
      usecaseSystemIds: [],
    });

    expect(result.includedDataLinkSystemIds).toEqual(['conn1', 'conn3']);
    expect(result.includedControlLinkSystemIds).toEqual(['conn2']);
  });

  it('excludes links present in excludedLinks from the included arrays', () => {
    const allLinks: Connection[] = [
      makeConnection('conn1', 'data'),
      makeConnection('conn2', 'control'),
      makeConnection('conn3', 'data'),
    ];

    const result = buildCreateUsecasesRequest({
      allLinks,
      excludedLinks: [makeConnection('conn1', 'data')],
      kvSelectionsById: {},
      usecaseSystemIds: [],
    });

    expect(result.includedDataLinkSystemIds).toEqual(['conn3']);
    expect(result.includedControlLinkSystemIds).toEqual(['conn2']);
  });

  it('returns an empty included-control array when every control link is excluded', () => {
    const allLinks: Connection[] = [makeConnection('conn1', 'data')];

    const result = buildCreateUsecasesRequest({
      allLinks,
      excludedLinks: [],
      kvSelectionsById: {},
      usecaseSystemIds: [],
    });

    expect(result.includedDataLinkSystemIds).toEqual(['conn1']);
    expect(result.includedControlLinkSystemIds).toEqual([]);
  });
});
