/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValue} from '~entities/usecases';
import {buildCreateUsecasesRequest} from '~features/graph-designer/lib/build-create-usecases-request';
import type {KvSelection} from '~features/graph-designer/model/edit-session-slice';
import type {Connection} from '~features/graph-designer/model/graph-data-slice';

function makeKeyValue(id: number, valueSystemId: string): KeyValue {
  return {
    keyInfo: {keyId: id, keyLabel: `key${id}`, keySystemId: `ks${id}`},
    valueInfo: {valueId: id, valueLabel: `value${id}`, valueSystemId},
  } as unknown as KeyValue;
}

describe('buildCreateUsecasesRequest', () => {
  it('returns empty inputs unchanged with no excluded-* keys', () => {
    const result = buildCreateUsecasesRequest({
      excludedLinks: [],
      kvSelectionsById: {},
      selectedUsecaseSystemIds: [],
    });

    expect(result.selectedUsecaseSystemIds).toEqual([]);
    expect(result.activeSubgraphs).toEqual([]);
    expect(Object.keys(result)).not.toContain('excludedDataLinkSystemIds');
    expect(Object.keys(result)).not.toContain('excludedControlLinkSystemIds');
  });

  it('filters unselected KV entries and maps to valueSystemIds', () => {
    const kv1 = makeKeyValue(1, 'vs1');
    const kv2 = makeKeyValue(2, 'vs2');
    const kv3 = makeKeyValue(3, 'vs3');

    const kvSelectionsById: Record<string, KvSelection[]> = {
      sg1: [
        {
          keyValuePairs: [kv1, kv2],
          selected: true,
          systemId: 'sel1',
        },
        {
          keyValuePairs: [kv3],
          selected: false,
          systemId: 'sel2',
        },
      ],
    };

    const result = buildCreateUsecasesRequest({
      excludedLinks: [],
      kvSelectionsById,
      selectedUsecaseSystemIds: ['uc1'],
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
          keyValuePairs: [kv1],
          selected: false,
          systemId: 'sel1',
        },
      ],
    };

    const result = buildCreateUsecasesRequest({
      excludedLinks: [],
      kvSelectionsById,
      selectedUsecaseSystemIds: [],
    });

    expect(result.activeSubgraphs).toHaveLength(1);
    expect(result.activeSubgraphs[0]).toEqual({
      systemId: 'sg1',
      valueSystemIds: [],
    });
  });

  it('partitions mixed excludedLinks into data and control arrays', () => {
    const excludedLinks: Connection[] = [
      {
        connectionId: 'conn1',
        connectionType: 'data',
        fromModuleId: 'm1',
        fromPortId: 'p1',
        toModuleId: 'm2',
        toPortId: 'p2',
      },
      {
        connectionId: 'conn2',
        connectionType: 'control',
        fromModuleId: 'm2',
        fromPortId: 'p3',
        toModuleId: 'm3',
        toPortId: 'p4',
      },
      {
        connectionId: 'conn3',
        connectionType: 'data',
        fromModuleId: 'm3',
        fromPortId: 'p5',
        toModuleId: 'm4',
        toPortId: 'p6',
      },
    ];

    const result = buildCreateUsecasesRequest({
      excludedLinks,
      kvSelectionsById: {},
      selectedUsecaseSystemIds: [],
    });

    expect(result.excludedDataLinkSystemIds).toEqual(['conn1', 'conn3']);
    expect(result.excludedControlLinkSystemIds).toEqual(['conn2']);
  });

  it('omits excludedControlLinkSystemIds key when no control links excluded', () => {
    const excludedLinks: Connection[] = [
      {
        connectionId: 'conn1',
        connectionType: 'data',
        fromModuleId: 'm1',
        fromPortId: 'p1',
        toModuleId: 'm2',
        toPortId: 'p2',
      },
    ];

    const result = buildCreateUsecasesRequest({
      excludedLinks,
      kvSelectionsById: {},
      selectedUsecaseSystemIds: [],
    });

    expect(result.excludedDataLinkSystemIds).toEqual(['conn1']);
    expect(Object.keys(result)).not.toContain('excludedControlLinkSystemIds');
  });
});
