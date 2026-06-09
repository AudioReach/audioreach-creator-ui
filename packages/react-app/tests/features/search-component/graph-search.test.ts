/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import type {LevelView} from '~features/usecase-visualizer';
import {
  computeContainsMatchIds,
  parseSearchTerm,
  searchLevelView,
} from '~widgets/graph-designer/lib/graph-search';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const level: LevelView = {
  containers: [
    {
      containerId: 10,
      height: 100,
      id: 'container-10:1',
      label: 'Container 10',
      nodeKind: 'container',
      parentId: 'subgraph-1',
      width: 200,
      x: 10,
      y: 10,
    },
  ],
  levelId: 'test',
  modules: [
    {
      alias: 'MyDecoder',
      height: 80,
      id: 'module-1',
      label: 'AudioDecoder',
      moduleId: 200,
      moduleType: 'AudioDecoder',
      nodeKind: 'module',
      parentId: 'container-10:1',
      ports: [],
      width: 120,
      x: 5,
      y: 5,
    },
  ],
  subgraphs: [
    {
      height: 200,
      id: 'subgraph-1',
      label: 'Subgraph 1',
      nodeKind: 'subgraph',
      subgraphId: 1,
      width: 300,
      x: 0,
      y: 0,
    },
  ],
  subsystems: [
    {
      height: 150,
      id: 'subsystem-1',
      label: 'AudioSubsystem',
      nodeKind: 'subsystem',
      ports: [],
      subsystemId: '1',
      width: 200,
      x: 400,
      y: 0,
    },
  ],
};

// ---------------------------------------------------------------------------
// parseSearchTerm
// ---------------------------------------------------------------------------

describe('parseSearchTerm', () => {
  it('returns null prefix for plain text (no colon)', () => {
    expect(parseSearchTerm('AudioDecoder')).toEqual({
      prefix: null,
      value: 'AudioDecoder',
    });
  });

  it('returns mod prefix for "mod:foo"', () => {
    expect(parseSearchTerm('mod:foo')).toEqual({prefix: 'mod', value: 'foo'});
  });

  it('returns sg prefix for "sg:1"', () => {
    expect(parseSearchTerm('sg:1')).toEqual({prefix: 'sg', value: '1'});
  });

  it('returns ss prefix for "ss:Audio"', () => {
    expect(parseSearchTerm('ss:Audio')).toEqual({
      prefix: 'ss',
      value: 'Audio',
    });
  });

  it('returns cnt prefix for "cnt:10"', () => {
    expect(parseSearchTerm('cnt:10')).toEqual({prefix: 'cnt', value: '10'});
  });

  it('returns invalid prefix for unknown prefix "xyz:foo"', () => {
    expect(parseSearchTerm('xyz:foo')).toEqual({
      prefix: 'invalid',
      value: 'foo',
    });
  });

  it('is case-insensitive for prefix (MOD: → mod)', () => {
    expect(parseSearchTerm('MOD:foo')).toEqual({prefix: 'mod', value: 'foo'});
  });
});

// ---------------------------------------------------------------------------
// searchLevelView — edge cases
// ---------------------------------------------------------------------------

describe('searchLevelView — edge cases', () => {
  it('returns empty array for blank search term', () => {
    expect(searchLevelView(level, '')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only search term', () => {
    expect(searchLevelView(level, '   ')).toHaveLength(0);
  });

  it('returns empty array for unknown prefix', () => {
    expect(searchLevelView(level, 'xyz:Audio')).toHaveLength(0);
  });

  it('returns empty array for prefix with empty value (mod:)', () => {
    expect(searchLevelView(level, 'mod:')).toHaveLength(0);
  });

  it('returns empty array when no nodes match', () => {
    expect(searchLevelView(level, 'NonExistentTerm')).toHaveLength(0);
  });

  it('first match nodeId equals the first element', () => {
    const matches = searchLevelView(level, 'mod:200');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].nodeId).toBe('module-1');
  });
});

// ---------------------------------------------------------------------------
// searchLevelView — mod: prefix
// ---------------------------------------------------------------------------

describe('searchLevelView — mod: prefix', () => {
  it('finds module by moduleId (numeric exact match)', () => {
    const ids = searchLevelView(level, 'mod:200').map((m) => m.nodeId);
    expect(ids).toContain('module-1');
  });

  it('does not match by partial numeric value (mod:20 ≠ moduleId 200)', () => {
    const ids = searchLevelView(level, 'mod:20').map((m) => m.nodeId);
    expect(ids).not.toContain('module-1');
  });

  it('finds module by label (case-insensitive partial match)', () => {
    const ids = searchLevelView(level, 'mod:audiodecoder').map((m) => m.nodeId);
    expect(ids).toContain('module-1');
  });

  it('finds module by alias', () => {
    const ids = searchLevelView(level, 'mod:mydecoder').map((m) => m.nodeId);
    expect(ids).toContain('module-1');
  });

  it('does not return non-module nodes for mod: prefix', () => {
    const matches = searchLevelView(level, 'mod:AudioDecoder');
    expect(matches.every((m) => m.node.nodeKind === 'module')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// searchLevelView — sg: prefix
// ---------------------------------------------------------------------------

describe('searchLevelView — sg: prefix', () => {
  it('finds subgraph by subgraphId (numeric exact match)', () => {
    const ids = searchLevelView(level, 'sg:1').map((m) => m.nodeId);
    expect(ids).toContain('subgraph-1');
  });

  it('does not match by partial numeric value (sg:10 ≠ subgraphId 1)', () => {
    const ids = searchLevelView(level, 'sg:10').map((m) => m.nodeId);
    expect(ids).not.toContain('subgraph-1');
  });

  it('finds subgraph by label (case-insensitive partial match)', () => {
    const ids = searchLevelView(level, 'sg:Subgraph').map((m) => m.nodeId);
    expect(ids).toContain('subgraph-1');
  });

  it('does not return non-subgraph nodes for sg: prefix', () => {
    const matches = searchLevelView(level, 'sg:Subgraph 1');
    expect(matches.every((m) => m.node.nodeKind === 'subgraph')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// searchLevelView — ss: prefix
// ---------------------------------------------------------------------------

describe('searchLevelView — ss: prefix', () => {
  it('finds subsystem by label (partial match)', () => {
    const ids = searchLevelView(level, 'ss:AudioSubsystem').map(
      (m) => m.nodeId,
    );
    expect(ids).toContain('subsystem-1');
  });

  it('finds subsystem by label (case-insensitive)', () => {
    const ids = searchLevelView(level, 'ss:audio').map((m) => m.nodeId);
    expect(ids).toContain('subsystem-1');
  });

  it('finds subsystem by numeric id suffix', () => {
    const ids = searchLevelView(level, 'ss:1').map((m) => m.nodeId);
    expect(ids).toContain('subsystem-1');
  });

  it('does not return non-subsystem nodes for ss: prefix', () => {
    const matches = searchLevelView(level, 'ss:AudioSubsystem');
    expect(matches.every((m) => m.node.nodeKind === 'subsystem')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// searchLevelView — cnt: prefix
// ---------------------------------------------------------------------------

describe('searchLevelView — cnt: prefix', () => {
  it('finds container by containerId (numeric exact match)', () => {
    const ids = searchLevelView(level, 'cnt:10').map((m) => m.nodeId);
    expect(ids).toContain('container-10:1');
  });

  it('does not match by partial numeric value (cnt:1 ≠ containerId 10)', () => {
    const ids = searchLevelView(level, 'cnt:1').map((m) => m.nodeId);
    expect(ids).not.toContain('container-10:1');
  });

  it('finds container by label (case-insensitive partial match)', () => {
    const ids = searchLevelView(level, 'cnt:container').map((m) => m.nodeId);
    expect(ids).toContain('container-10:1');
  });

  it('does not return non-container nodes for cnt: prefix', () => {
    const matches = searchLevelView(level, 'cnt:Container 10');
    expect(matches.every((m) => m.node.nodeKind === 'container')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// searchLevelView — default search (no prefix)
// ---------------------------------------------------------------------------

describe('searchLevelView — default search (no prefix)', () => {
  it('finds module by label', () => {
    const ids = searchLevelView(level, 'AudioDecoder').map((m) => m.nodeId);
    expect(ids).toContain('module-1');
  });

  it('finds subgraph by label', () => {
    const ids = searchLevelView(level, 'Subgraph 1').map((m) => m.nodeId);
    expect(ids).toContain('subgraph-1');
  });

  it('finds subsystem by label', () => {
    const ids = searchLevelView(level, 'AudioSubsystem').map((m) => m.nodeId);
    expect(ids).toContain('subsystem-1');
  });

  it('finds container by label', () => {
    const ids = searchLevelView(level, 'Container 10').map((m) => m.nodeId);
    expect(ids).toContain('container-10:1');
  });

  it('finds module by moduleId numeric match', () => {
    const ids = searchLevelView(level, '200').map((m) => m.nodeId);
    expect(ids).toContain('module-1');
  });

  it('is case-insensitive', () => {
    const ids = searchLevelView(level, 'audiodecoder').map((m) => m.nodeId);
    expect(ids).toContain('module-1');
  });
});

// ---------------------------------------------------------------------------
// computeContainsMatchIds
// ---------------------------------------------------------------------------

describe('computeContainsMatchIds', () => {
  it('returns empty when no subgraphs are collapsed', () => {
    const matches = searchLevelView(level, 'mod:200');
    expect(computeContainsMatchIds(matches, new Set())).toHaveLength(0);
  });

  it('returns proxy id when match is inside a collapsed subgraph', () => {
    // module-1 is in container-10:1 which is inside subgraph-1 (subgraphId 1)
    const matches = searchLevelView(level, 'mod:200');
    const ids = computeContainsMatchIds(matches, new Set([1]));
    expect(ids).toContain('subgraph-proxy-1');
  });

  it('returns empty when matched node is a subgraph (subgraph is not inside itself)', () => {
    const matches = searchLevelView(level, 'sg:1');
    // subgraphId 1 is collapsed, but the match IS the subgraph node — it is
    // not inside itself, so no proxy affordance should be set
    const ids = computeContainsMatchIds(matches, new Set([1]));
    expect(ids).toHaveLength(0);
  });

  it('does not return proxy when the containing subgraph is not collapsed', () => {
    const matches = searchLevelView(level, 'mod:200');
    // subgraphId 99 is collapsed, but module-1 is inside subgraphId 1
    const ids = computeContainsMatchIds(matches, new Set([99]));
    expect(ids).not.toContain('subgraph-proxy-1');
  });

  it('deduplicates proxy ids when multiple matches share the same collapsed subgraph', () => {
    const levelWithTwo: LevelView = {
      ...level,
      modules: [
        ...(level.modules ?? []),
        {
          alias: undefined,
          height: 80,
          id: 'module-2',
          label: 'AudioEncoder',
          moduleId: 201,
          moduleType: 'AudioEncoder',
          nodeKind: 'module',
          parentId: 'container-10:1',
          ports: [],
          width: 120,
          x: 5,
          y: 5,
        },
      ],
    };
    const matches = searchLevelView(levelWithTwo, 'Audio');
    const ids = computeContainsMatchIds(matches, new Set([1]));
    expect(ids.filter((id) => id === 'subgraph-proxy-1')).toHaveLength(1);
  });
});
