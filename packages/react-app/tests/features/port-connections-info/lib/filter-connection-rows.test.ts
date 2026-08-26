/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {filterConnectionRows} from '~features/port-connections-info/lib/filter-connection-rows';
import type {ConnectionRow} from '~features/port-connections-info/model/port-connections-info.types';

function makeRow(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    connectionType: 'MODULE_MODULE',
    isDangling: false,
    moduleId: '0x00000001',
    moduleName: 'AudioDecoder',
    otherModuleSystemId: 'sys-mod-2',
    otherPortId: '0x00000002',
    subgraphSystemId: 'sys-sg-1',
    systemId: 'link-1',
    usecases: [],
    ...overrides,
  };
}

describe('filterConnectionRows', () => {
  it('"all" returns every row unchanged', () => {
    const rows = [
      makeRow({isDangling: false, systemId: 'link-1'}),
      makeRow({isDangling: true, systemId: 'link-2'}),
    ];
    expect(filterConnectionRows(rows, 'all')).toEqual(rows);
  });

  it('"sg" returns only rows where isDangling is false', () => {
    const sgRow = makeRow({isDangling: false, systemId: 'link-1'});
    const danglingRow = makeRow({isDangling: true, systemId: 'link-2'});
    const result = filterConnectionRows([sgRow, danglingRow], 'sg');
    expect(result).toEqual([sgRow]);
  });

  it('"dangling" returns only rows where isDangling is true', () => {
    const sgRow = makeRow({isDangling: false, systemId: 'link-1'});
    const danglingRow = makeRow({isDangling: true, systemId: 'link-2'});
    const result = filterConnectionRows([sgRow, danglingRow], 'dangling');
    expect(result).toEqual([danglingRow]);
  });

  it('returns an empty array when no rows match "dangling"', () => {
    const rows = [makeRow({isDangling: false})];
    expect(filterConnectionRows(rows, 'dangling')).toEqual([]);
  });

  it('returns an empty array unchanged for "all" on an empty input', () => {
    expect(filterConnectionRows([], 'all')).toEqual([]);
  });
});
