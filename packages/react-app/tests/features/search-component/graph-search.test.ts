/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  parseSearchTerm,
  searchGraphData,
} from '~widgets/graph-designer/lib/graph-search';

const graph: UsecaseGraphData = {
  connections: [],
  containers: {
    '10': {
      containerId: '10',
      containerName: 'Container 10',
      moduleInstances: ['sys-module-1'],
      subgraphId: '1',
    },
  },
  moduleInstances: {
    'sys-module-1': {
      containerId: '10',
      displayName: 'AudioDecoder',
      inputPorts: [],
      moduleId: '200',
      moduleInstanceId: 'sys-module-1',
      moduleName: 'AudioDecoder',
      moduleType: 'AudioDecoder',
      outputPorts: [],
      position: {x: 0, y: 0},
      subgraphId: '1',
    },
  },
  selectedUsecases: [],
  subgraphs: {
    '1': {
      containers: ['10'],
      subgraphId: '1',
      subgraphName: 'Subgraph 1',
      subgraphType: '',
    },
  },
  subsystems: {
    '1': {
      controlPorts: [],
      dataPorts: [],
      id: 1,
      subgraphs: [],
      subsystemId: '1',
      subsystemName: 'AudioSubsystem',
    },
  },
};

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

describe('searchGraphData — edge cases', () => {
  it('returns empty highlights for blank search term', () => {
    const result = searchGraphData(graph, '');
    expect(result.highlightedIds).toHaveLength(0);
    expect(result.activeId).toBeUndefined();
  });

  it('returns empty highlights for whitespace-only search term', () => {
    const result = searchGraphData(graph, '   ');
    expect(result.highlightedIds).toHaveLength(0);
    expect(result.activeId).toBeUndefined();
  });

  it('returns empty highlights for unknown prefix', () => {
    const result = searchGraphData(graph, 'xyz:Audio');
    expect(result.highlightedIds).toHaveLength(0);
    expect(result.activeId).toBeUndefined();
  });

  it('returns empty highlights for prefix with empty value (mod:)', () => {
    const result = searchGraphData(graph, 'mod:');
    expect(result.highlightedIds).toHaveLength(0);
  });

  it('returns empty highlights when no nodes match', () => {
    const result = searchGraphData(graph, 'NonExistentTerm');
    expect(result.highlightedIds).toHaveLength(0);
  });

  it('first match in highlightedIds is set as activeId', () => {
    const result = searchGraphData(graph, 'mod:200');
    expect(result.highlightedIds.length).toBeGreaterThan(0);
    expect(result.activeId).toBe(result.highlightedIds[0]);
  });
});

describe('searchGraphData — mod: prefix', () => {
  it('finds module by moduleId (numeric exact match)', () => {
    const result = searchGraphData(graph, 'mod:200');
    expect(result.highlightedIds).toContain('sys-module-1');
  });

  it('does not match by partial numeric value (mod:20 ≠ moduleId 200)', () => {
    const result = searchGraphData(graph, 'mod:20');
    expect(result.highlightedIds).not.toContain('sys-module-1');
  });

  it('mod:<number> matches moduleId field, not the node id string', () => {
    const byIdString = searchGraphData(graph, 'mod:1');
    expect(byIdString.highlightedIds).not.toContain('sys-module-1');

    const byModuleId = searchGraphData(graph, 'mod:200');
    expect(byModuleId.highlightedIds).toContain('sys-module-1');
  });

  it('finds module by label (case-insensitive partial match)', () => {
    const result = searchGraphData(graph, 'mod:audiodecoder');
    expect(result.highlightedIds).toContain('sys-module-1');
  });

  it('does not return non-module nodes for mod: prefix', () => {
    const result = searchGraphData(graph, 'mod:AudioDecoder');
    expect(
      result.highlightedIds.every((id) =>
        Object.keys(graph.moduleInstances).includes(id),
      ),
    ).toBe(true);
  });

  it('sets activeId to the matching module id', () => {
    const result = searchGraphData(graph, 'mod:200');
    expect(result.activeId).toBe('sys-module-1');
  });
});

describe('searchGraphData — sg: prefix', () => {
  it('finds subgraph by subgraphId (numeric exact match)', () => {
    const result = searchGraphData(graph, 'sg:1');
    expect(result.highlightedIds).toContain('subgraph-1');
  });

  it('does not match by partial numeric value (sg:10 ≠ subgraphId 1)', () => {
    const result = searchGraphData(graph, 'sg:10');
    expect(result.highlightedIds).not.toContain('subgraph-1');
  });

  it('finds subgraph by label (case-insensitive partial match)', () => {
    const result = searchGraphData(graph, 'sg:Subgraph');
    expect(result.highlightedIds).toContain('subgraph-1');
  });

  it('does not return non-subgraph nodes for sg: prefix', () => {
    const result = searchGraphData(graph, 'sg:Subgraph 1');
    expect(
      result.highlightedIds.every((id) => id.startsWith('subgraph-')),
    ).toBe(true);
  });

  it('sets activeId to the matching subgraph id', () => {
    const result = searchGraphData(graph, 'sg:1');
    expect(result.activeId).toBe('subgraph-1');
  });
});

describe('searchGraphData — ss: prefix', () => {
  it('finds subsystem by label (partial match)', () => {
    const result = searchGraphData(graph, 'ss:AudioSubsystem');
    expect(result.highlightedIds).toContain('1');
  });

  it('finds subsystem by label (case-insensitive partial match)', () => {
    const result = searchGraphData(graph, 'ss:audio');
    expect(result.highlightedIds).toContain('1');
  });

  it('finds subsystem by numeric subsystemId', () => {
    const result = searchGraphData(graph, 'ss:1');
    expect(result.highlightedIds).toContain('1');
  });

  it('does not return non-subsystem nodes for ss: prefix', () => {
    const result = searchGraphData(graph, 'ss:AudioSubsystem');
    expect(
      result.highlightedIds.every((id) =>
        Object.keys(graph.subsystems).includes(id),
      ),
    ).toBe(true);
  });

  it('sets activeId to the matching subsystem id', () => {
    const result = searchGraphData(graph, 'ss:AudioSubsystem');
    expect(result.activeId).toBe('1');
  });
});

describe('searchGraphData — cnt: prefix', () => {
  it('finds container by containerId (numeric exact match)', () => {
    const result = searchGraphData(graph, 'cnt:10');
    expect(result.highlightedIds).toContain('container-10:1');
  });

  it('does not match by partial numeric value (cnt:1 ≠ containerId 10)', () => {
    const result = searchGraphData(graph, 'cnt:1');
    expect(result.highlightedIds).not.toContain('container-10:1');
  });

  it('finds container by label (case-insensitive partial match)', () => {
    const result = searchGraphData(graph, 'cnt:container');
    expect(result.highlightedIds).toContain('container-10:1');
  });

  it('does not return non-container nodes for cnt: prefix', () => {
    const result = searchGraphData(graph, 'cnt:Container 10');
    expect(
      result.highlightedIds.every((id) => id.startsWith('container-')),
    ).toBe(true);
  });

  it('sets activeId to the matching container id', () => {
    const result = searchGraphData(graph, 'cnt:10');
    expect(result.activeId).toBe('container-10:1');
  });
});

describe('searchGraphData — default search (no prefix)', () => {
  it('finds module by label', () => {
    const result = searchGraphData(graph, 'AudioDecoder');
    expect(result.highlightedIds).toContain('sys-module-1');
  });

  it('finds subgraph by label', () => {
    const result = searchGraphData(graph, 'Subgraph 1');
    expect(result.highlightedIds).toContain('subgraph-1');
  });

  it('finds subsystem by label', () => {
    const result = searchGraphData(graph, 'AudioSubsystem');
    expect(result.highlightedIds).toContain('1');
  });

  it('finds container by label', () => {
    const result = searchGraphData(graph, 'Container 10');
    expect(result.highlightedIds).toContain('container-10:1');
  });

  it('finds module by moduleId numeric match', () => {
    const result = searchGraphData(graph, '200');
    expect(result.highlightedIds).toContain('sys-module-1');
  });

  it('does not match partial numeric value across all kinds', () => {
    const result = searchGraphData(graph, '20');
    expect(result.highlightedIds).toHaveLength(0);
  });

  it('sets activeId to the first match in highlightedIds', () => {
    const result = searchGraphData(graph, 'AudioDecoder');
    expect(result.activeId).toBe(result.highlightedIds[0]);
  });

  it('is case-insensitive', () => {
    const result = searchGraphData(graph, 'audiodecoder');
    expect(result.highlightedIds).toContain('sys-module-1');
  });
});

// Multi-level hierarchy: subsystem → subgraph → container → two modules.
// Subgraph → subsystem link is not tracked in UsecaseGraphData, so ancestry
// stops at the subgraph level.
const deepGraph: UsecaseGraphData = {
  connections: [],
  containers: {
    '20': {
      containerId: '20',
      containerName: 'Container 20',
      moduleInstances: ['mod-deep', 'mod-top'],
      subgraphId: '5',
    },
  },
  moduleInstances: {
    'mod-deep': {
      containerId: '20',
      displayName: 'AudioEncoder',
      inputPorts: [],
      moduleId: '300',
      moduleInstanceId: 'mod-deep',
      moduleName: 'AudioEncoder',
      moduleType: 'AudioEncoder',
      outputPorts: [],
      position: {x: 0, y: 0},
      subgraphId: '5',
    },
    'mod-top': {
      containerId: '20',
      displayName: 'TopModule',
      inputPorts: [],
      moduleId: '400',
      moduleInstanceId: 'mod-top',
      moduleName: 'TopModule',
      moduleType: 'TopModule',
      outputPorts: [],
      position: {x: 0, y: 0},
      subgraphId: '5',
    },
  },
  selectedUsecases: [],
  subgraphs: {
    '5': {
      containers: ['20'],
      subgraphId: '5',
      subgraphName: 'MainSubgraph',
      subgraphType: '',
    },
  },
  subsystems: {
    '1': {
      controlPorts: [],
      dataPorts: [],
      id: 1,
      subgraphs: [],
      subsystemId: '1',
      subsystemName: 'MainSubsystem',
    },
  },
};

describe('searchGraphData — containsMatchNodeIds', () => {
  it('is empty when matched node has no parents in the hierarchy', () => {
    const result = searchGraphData(deepGraph, 'sg:5');
    expect(result.highlightedIds).toContain('subgraph-5');
    expect(result.containsMatchNodeIds).toHaveLength(0);
  });

  it('collects direct parent (container) of matched module', () => {
    const result = searchGraphData(deepGraph, 'mod:300');
    expect(result.highlightedIds).toContain('mod-deep');
    expect(result.containsMatchNodeIds).toContain('container-20:5');
  });

  it('collects full ancestor chain up to subgraph (module → container → subgraph)', () => {
    const result = searchGraphData(deepGraph, 'mod:300');
    expect(result.containsMatchNodeIds).toContain('container-20:5');
    expect(result.containsMatchNodeIds).toContain('subgraph-5');
    expect(result.containsMatchNodeIds).toHaveLength(2);
  });

  it('deduplicates ancestors shared by multiple matches', () => {
    const result = searchGraphData(deepGraph, 'mod:300');
    const unique = new Set(result.containsMatchNodeIds);
    expect(unique.size).toBe(result.containsMatchNodeIds.length);
  });

  it('is empty for no-match searches', () => {
    const result = searchGraphData(deepGraph, 'zzznomatch');
    expect(result.containsMatchNodeIds).toHaveLength(0);
  });
});
