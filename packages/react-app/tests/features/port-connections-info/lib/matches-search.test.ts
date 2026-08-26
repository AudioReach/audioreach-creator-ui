/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {matchesSearch} from '~features/port-connections-info/lib/matches-search';
import type {ConnectionRow} from '~features/port-connections-info/model/port-connections-info.types';

const row: ConnectionRow = {
  connectionType: 'MODULE_MODULE',
  isDangling: false,
  moduleId: '0x1A2B',
  moduleName: 'Encoder',
  otherModuleSystemId: 'mod-sys-1',
  otherPortId: '0x03',
  subgraphSystemId: 'sg-sys-1',
  systemId: 'link-sys-1',
  usecases: [],
};

const resolveSubgraphDisplay = (subgraphSystemId: string): string =>
  subgraphSystemId === 'sg-sys-1' ? 'SG_02' : subgraphSystemId;

describe('matchesSearch', () => {
  it('matches everything when the query is empty', () => {
    expect(matchesSearch(row, '', resolveSubgraphDisplay)).toBe(true);
    expect(matchesSearch(row, '   ', resolveSubgraphDisplay)).toBe(true);
  });

  it('matches module name as a case-insensitive substring with no prefix', () => {
    expect(matchesSearch(row, 'enco', resolveSubgraphDisplay)).toBe(true);
    expect(matchesSearch(row, 'ENCO', resolveSubgraphDisplay)).toBe(true);
    expect(matchesSearch(row, 'zzz', resolveSubgraphDisplay)).toBe(false);
  });

  it('mod: prefix matches module name explicitly', () => {
    expect(matchesSearch(row, 'mod:code', resolveSubgraphDisplay)).toBe(true);
    expect(matchesSearch(row, 'mod:zzz', resolveSubgraphDisplay)).toBe(false);
  });

  it('iid: prefix matches the hex module id, not the module name', () => {
    expect(matchesSearch(row, 'iid:1a2b', resolveSubgraphDisplay)).toBe(true);
    expect(matchesSearch(row, 'iid:enco', resolveSubgraphDisplay)).toBe(false);
  });

  it('sg: prefix matches the resolved subgraph display value, not the raw systemId', () => {
    expect(matchesSearch(row, 'sg:sg_02', resolveSubgraphDisplay)).toBe(true);
    expect(matchesSearch(row, 'sg:sg-sys-1', resolveSubgraphDisplay)).toBe(
      false,
    );
  });
});
