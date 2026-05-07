/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  NODE_KIND,
  type RFNode,
  type SearchHighlightState,
} from '~features/usecase-visualizer/model/usecase-visualizer.types';
import {
  parseSearchTerm,
  searchNodes,
} from '~widgets/graph-designer/lib/graph-search';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Module node:
 *   instanceId = 100  (extracted from node.id 'module-100')
 *   moduleId   = 200  (data.moduleId)
 *   name       = 'AudioDecoder'
 *   alias      = 'MyDecoder'
 */
const moduleNode: RFNode = {
  data: {
    alias: 'MyDecoder',
    containerId: 1,
    controlPorts: [],
    dataPorts: [],
    kind: NODE_KIND.MODULE,
    label: 'AudioDecoder',
    moduleId: 200,
    name: 'AudioDecoder',
    subgraphId: 1,
  },
  id: 'module-100',
  position: {x: 0, y: 0},
};

/**
 * Second module node:
 *   instanceId = 300  (extracted from node.id 'module-300')
 *   moduleId   = 400  (data.moduleId)
 *   name       = 'VideoEncoder'
 *   alias      = 'VidEnc'
 */
const moduleNode2: RFNode = {
  data: {
    alias: 'VidEnc',
    containerId: 2,
    controlPorts: [],
    dataPorts: [],
    kind: NODE_KIND.MODULE,
    label: 'VideoEncoder',
    moduleId: 400,
    name: 'VideoEncoder',
    subgraphId: 1,
  },
  id: 'module-300',
  position: {x: 0, y: 0},
};

/**
 * Subgraph node:
 *   id   = 10  (extracted from node.id 'subgraph-10')
 *   name = 'MainGraph'
 */
const subgraphNode: RFNode = {
  data: {
    kind: NODE_KIND.SUBGRAPH,
    label: 'MainGraph',
    name: 'MainGraph',
  },
  id: 'subgraph-10',
  position: {x: 0, y: 0},
};

/**
 * Container node:
 *   containerId = 50  (data.containerId — containers are matched by this field only)
 */
const containerNode: RFNode = {
  data: {
    containerId: 50,
    kind: NODE_KIND.CONTAINER,
    label: 'Container50',
    name: 'Container50',
    subgraphId: 10,
  },
  id: 'container-1-50',
  position: {x: 0, y: 0},
};

/**
 * Subsystem node:
 *   id   = 5  (extracted from node.id 'subsystem-5')
 *   name = 'AudioSubsystem'
 */
const subsystemNode: RFNode = {
  data: {
    kind: NODE_KIND.SUBSYSTEM,
    label: 'AudioSubsystem',
    name: 'AudioSubsystem',
  },
  id: 'subsystem-5',
  position: {x: 0, y: 0},
};

/** All nodes used in most tests */
const allNodes: RFNode[] = [
  moduleNode,
  moduleNode2,
  subgraphNode,
  containerNode,
  subsystemNode,
];

// ---------------------------------------------------------------------------
// Helper: simulate the nodesWithSelection annotation from UsecaseVisualizer
// ---------------------------------------------------------------------------

/**
 * Mirrors the annotation logic in UsecaseVisualizer.nodesWithSelection.
 * Returns a lightweight view of each node's computed searchHighlight state.
 */
function annotateHighlights(
  nodes: RFNode[],
  matches: RFNode[],
  activeId: string | null,
): Array<{id: string; searchHighlight: SearchHighlightState}> {
  const matchIds = new Set(matches.map((n) => n.id));
  return nodes.map((node) => {
    const isActive = activeId === node.id;
    const isMatch = !isActive && matchIds.has(node.id);
    return {
      id: node.id,
      searchHighlight: isActive ? 'active' : isMatch ? 'match' : 'none',
    };
  });
}

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

  it('returns sg prefix for "sg:10"', () => {
    expect(parseSearchTerm('sg:10')).toEqual({prefix: 'sg', value: '10'});
  });

  it('returns ss prefix for "ss:Audio"', () => {
    expect(parseSearchTerm('ss:Audio')).toEqual({
      prefix: 'ss',
      value: 'Audio',
    });
  });

  it('returns cnt prefix for "cnt:50"', () => {
    expect(parseSearchTerm('cnt:50')).toEqual({prefix: 'cnt', value: '50'});
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
// searchNodes — edge cases
// ---------------------------------------------------------------------------

describe('searchNodes — edge cases', () => {
  it('returns empty array for blank search term', () => {
    expect(searchNodes(allNodes, '')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only search term', () => {
    expect(searchNodes(allNodes, '   ')).toHaveLength(0);
  });

  it('returns empty array for unknown prefix', () => {
    expect(searchNodes(allNodes, 'xyz:Audio')).toHaveLength(0);
  });

  it('returns empty array for prefix with empty value (mod:)', () => {
    expect(searchNodes(allNodes, 'mod:')).toHaveLength(0);
  });

  it('returns empty array when no nodes match', () => {
    expect(searchNodes(allNodes, 'NonExistentTerm')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// searchNodes — Prefix-based search
// ---------------------------------------------------------------------------

describe('searchNodes — Prefix-based search', () => {
  // ── A. Module (mod:) ──────────────────────────────────────────────────────

  describe('A. Module prefix (mod:)', () => {
    describe('A1: Search Module by Id (ModuleId)', () => {
      it('returns only the module whose ModuleId exactly matches', () => {
        const results = searchNodes(allNodes, 'mod:200');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('restricts results to MODULE kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'mod:200');

        expect(results.every((n) => n.data.kind === NODE_KIND.MODULE)).toBe(
          true,
        );
      });

      it('does NOT match by partial numeric value (mod:20 ≠ moduleId 200)', () => {
        expect(searchNodes(allNodes, 'mod:20')).toHaveLength(0);
      });

      it('returns empty array when no module has the given ModuleId', () => {
        expect(searchNodes(allNodes, 'mod:999')).toHaveLength(0);
      });

      it('first match gets active highlight, others get match highlight', () => {
        const matches = searchNodes(allNodes, 'mod:200');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        const moduleAnnotation = annotations.find((a) => a.id === 'module-100');
        expect(moduleAnnotation?.searchHighlight).toBe('active');

        // All non-matching nodes should be 'none'
        annotations
          .filter((a) => a.id !== 'module-100')
          .forEach((a) => expect(a.searchHighlight).toBe('none'));
      });
    });

    describe('A2: Search Module by InstanceId', () => {
      it('returns only the module whose InstanceId exactly matches', () => {
        const results = searchNodes(allNodes, 'mod:100');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('restricts results to MODULE kind', () => {
        const results = searchNodes(allNodes, 'mod:100');

        expect(results.every((n) => n.data.kind === NODE_KIND.MODULE)).toBe(
          true,
        );
      });

      it('does NOT match by partial numeric value (mod:10 ≠ instanceId 100)', () => {
        expect(searchNodes(allNodes, 'mod:10')).toHaveLength(0);
      });

      it('first match gets active highlight, others get match highlight', () => {
        const matches = searchNodes(allNodes, 'mod:100');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'module-100')?.searchHighlight,
        ).toBe('active');
      });
    });

    describe('A3: Search Module by Name (ModuleName)', () => {
      it('returns modules whose ModuleName partially matches', () => {
        const results = searchNodes(allNodes, 'mod:Audio');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('returns modules whose ModuleName exactly matches', () => {
        const results = searchNodes(allNodes, 'mod:AudioDecoder');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('is case-insensitive for name search', () => {
        const results = searchNodes(allNodes, 'mod:audiodecoder');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('restricts results to MODULE kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'mod:Audio');

        expect(results.every((n) => n.data.kind === NODE_KIND.MODULE)).toBe(
          true,
        );
      });

      it('first match gets active (orange) highlight; other matches get match (yellow) highlight', () => {
        // Use 'Encoder' to match both modules via name
        const encoderNode: RFNode = {
          ...moduleNode,
          data: {
            ...moduleNode.data,
            label: 'AudioEncoder',
            name: 'AudioEncoder',
          },
          id: 'module-101',
        };
        const nodes = [encoderNode, moduleNode2];
        const matches = searchNodes(nodes, 'mod:Encoder');
        expect(matches).toHaveLength(2);

        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(nodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === matches[0].id)?.searchHighlight,
        ).toBe('active');
        expect(
          annotations.find((a) => a.id === matches[1].id)?.searchHighlight,
        ).toBe('match');
      });
    });

    describe('A4: Search Module by Alias Name (AliasName)', () => {
      it('returns modules whose AliasName partially matches', () => {
        const results = searchNodes(allNodes, 'mod:Decoder');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('returns modules whose AliasName exactly matches', () => {
        const results = searchNodes(allNodes, 'mod:MyDecoder');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('module-100');
      });

      it('restricts results to MODULE kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'mod:MyDecoder');

        expect(results.every((n) => n.data.kind === NODE_KIND.MODULE)).toBe(
          true,
        );
      });

      it('first match gets active highlight; focus is applied to first match', () => {
        const matches = searchNodes(allNodes, 'mod:MyDecoder');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'module-100')?.searchHighlight,
        ).toBe('active');
      });
    });
  });

  // ── B. Subgraph (sg:) ─────────────────────────────────────────────────────

  describe('B. Subgraph prefix (sg:)', () => {
    describe('B1: Search Subgraph by Id (SubgraphId)', () => {
      it('returns only the subgraph whose SubgraphId exactly matches', () => {
        const results = searchNodes(allNodes, 'sg:10');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('subgraph-10');
      });

      it('restricts results to SUBGRAPH kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'sg:10');

        expect(results.every((n) => n.data.kind === NODE_KIND.SUBGRAPH)).toBe(
          true,
        );
      });

      it('does NOT match by partial numeric value (sg:1 ≠ subgraphId 10)', () => {
        expect(searchNodes(allNodes, 'sg:1')).toHaveLength(0);
      });

      it('first match gets active highlight', () => {
        const matches = searchNodes(allNodes, 'sg:10');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'subgraph-10')?.searchHighlight,
        ).toBe('active');
      });
    });

    describe('B2: Search Subgraph by Name (SubgraphName)', () => {
      it('returns subgraphs whose SubgraphName partially matches', () => {
        const results = searchNodes(allNodes, 'sg:Main');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('subgraph-10');
      });

      it('returns subgraphs whose SubgraphName exactly matches', () => {
        const results = searchNodes(allNodes, 'sg:MainGraph');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('subgraph-10');
      });

      it('restricts results to SUBGRAPH kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'sg:Main');

        expect(results.every((n) => n.data.kind === NODE_KIND.SUBGRAPH)).toBe(
          true,
        );
      });

      it('first match gets active highlight', () => {
        const matches = searchNodes(allNodes, 'sg:MainGraph');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'subgraph-10')?.searchHighlight,
        ).toBe('active');
      });
    });
  });

  // ── C. Container (cnt:) ───────────────────────────────────────────────────

  describe('C. Container prefix (cnt:)', () => {
    describe('C1: Search Container by Id (ContainerId)', () => {
      it('returns only the container whose ContainerId exactly matches', () => {
        const results = searchNodes(allNodes, 'cnt:50');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('container-1-50');
      });

      it('restricts results to CONTAINER kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'cnt:50');

        expect(results.every((n) => n.data.kind === NODE_KIND.CONTAINER)).toBe(
          true,
        );
      });

      it('does NOT match by partial numeric value (cnt:5 ≠ containerId 50)', () => {
        expect(searchNodes(allNodes, 'cnt:5')).toHaveLength(0);
      });

      it('first match gets active highlight', () => {
        const matches = searchNodes(allNodes, 'cnt:50');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'container-1-50')?.searchHighlight,
        ).toBe('active');
      });
    });

    describe('C2: Search Container by Name (ContainerName)', () => {
      it('returns containers whose ContainerName partially matches', () => {
        const results = searchNodes(allNodes, 'cnt:Container');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('container-1-50');
      });

      it('returns containers whose ContainerName exactly matches', () => {
        const results = searchNodes(allNodes, 'cnt:Container50');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('container-1-50');
      });

      it('is case-insensitive for name search', () => {
        const results = searchNodes(allNodes, 'cnt:container50');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('container-1-50');
      });

      it('restricts results to CONTAINER kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'cnt:Container');

        expect(results.every((n) => n.data.kind === NODE_KIND.CONTAINER)).toBe(
          true,
        );
      });

      it('first match gets active highlight', () => {
        const matches = searchNodes(allNodes, 'cnt:Container50');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'container-1-50')?.searchHighlight,
        ).toBe('active');
      });
    });
  });

  // ── D. Subsystem (ss:) ────────────────────────────────────────────────────

  describe('D. Subsystem prefix (ss:)', () => {
    describe('D1: Search Subsystem by Id (SubsystemId)', () => {
      it('returns only the subsystem whose SubsystemId exactly matches', () => {
        const results = searchNodes(allNodes, 'ss:5');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('subsystem-5');
      });

      it('restricts results to SUBSYSTEM kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'ss:5');

        expect(results.every((n) => n.data.kind === NODE_KIND.SUBSYSTEM)).toBe(
          true,
        );
      });

      it('does NOT match by partial numeric value (ss:50 ≠ subsystemId 5)', () => {
        expect(searchNodes(allNodes, 'ss:50')).toHaveLength(0);
      });

      it('first match gets active highlight', () => {
        const matches = searchNodes(allNodes, 'ss:5');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'subsystem-5')?.searchHighlight,
        ).toBe('active');
      });
    });

    describe('D2: Search Subsystem by Name (SubsystemName)', () => {
      it('returns subsystems whose SubsystemName partially matches', () => {
        const results = searchNodes(allNodes, 'ss:Audio');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('subsystem-5');
      });

      it('returns subsystems whose SubsystemName exactly matches', () => {
        const results = searchNodes(allNodes, 'ss:AudioSubsystem');

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('subsystem-5');
      });

      it('restricts results to SUBSYSTEM kind — no other component types returned', () => {
        const results = searchNodes(allNodes, 'ss:Audio');

        expect(results.every((n) => n.data.kind === NODE_KIND.SUBSYSTEM)).toBe(
          true,
        );
      });

      it('first match gets active highlight', () => {
        const matches = searchNodes(allNodes, 'ss:AudioSubsystem');
        const activeId = matches[0]?.id ?? null;
        const annotations = annotateHighlights(allNodes, matches, activeId);

        expect(
          annotations.find((a) => a.id === 'subsystem-5')?.searchHighlight,
        ).toBe('active');
      });
    });
  });
});

// ---------------------------------------------------------------------------
// searchNodes — Direct search (no prefix)
// ---------------------------------------------------------------------------

describe('searchNodes — Direct search (no prefix)', () => {
  it('1. Search Module Name — partial match on ModuleName', () => {
    const results = searchNodes(allNodes, 'AudioDecoder');

    expect(results.some((n) => n.id === 'module-100')).toBe(true);
  });

  it('1. Search Module Name — case-insensitive partial match', () => {
    const results = searchNodes(allNodes, 'audiodecoder');

    expect(results.some((n) => n.id === 'module-100')).toBe(true);
  });

  it('2. Search Module ID — exact match on ModuleId (no partial)', () => {
    const results = searchNodes(allNodes, '200');

    // moduleNode has moduleId=200 → should match
    expect(results.some((n) => n.id === 'module-100')).toBe(true);
    // moduleNode2 has moduleId=400 → should NOT match
    expect(results.some((n) => n.id === 'module-300')).toBe(false);
  });

  it('2. Search Module ID — does NOT match by partial numeric value (20 ≠ moduleId 200)', () => {
    // 20 is numeric; no node has id/moduleId/containerId=20
    expect(searchNodes(allNodes, '20')).toHaveLength(0);
  });

  it('3. Search Module Alias — partial match on AliasName', () => {
    const results = searchNodes(allNodes, 'MyDecoder');

    expect(results.some((n) => n.id === 'module-100')).toBe(true);
  });

  it('3. Search Module Alias — case-insensitive partial match', () => {
    const results = searchNodes(allNodes, 'mydecoder');

    expect(results.some((n) => n.id === 'module-100')).toBe(true);
  });

  it('4. Search Module Instance ID — exact match on InstanceId (no partial)', () => {
    const results = searchNodes(allNodes, '100');

    // moduleNode has instanceId=100 → should match
    expect(results.some((n) => n.id === 'module-100')).toBe(true);
    // moduleNode2 has instanceId=300 → should NOT match
    expect(results.some((n) => n.id === 'module-300')).toBe(false);
  });

  it('4. Search Module Instance ID — does NOT match by partial numeric value (10 ≠ instanceId 100)', () => {
    // 10 is numeric; subgraphNode has id=10 → matches subgraph, not module
    const results = searchNodes(allNodes, '10');
    expect(results.some((n) => n.id === 'module-100')).toBe(false);
  });

  it('5. Search Subgraph ID — exact match on SubgraphId (no partial)', () => {
    const results = searchNodes(allNodes, '10');

    expect(results.some((n) => n.id === 'subgraph-10')).toBe(true);
    // Verify no module with instanceId=10 exists in fixtures
    expect(results.every((n) => n.data.kind !== NODE_KIND.MODULE)).toBe(true);
  });

  it('5. Search Subgraph ID — does NOT match by partial numeric value (1 ≠ subgraphId 10)', () => {
    // 1 is numeric; no node has id=1
    expect(searchNodes(allNodes, '1')).toHaveLength(0);
  });

  it('6. Search Subgraph Name — partial match on SubgraphName', () => {
    const results = searchNodes(allNodes, 'MainGraph');

    expect(results.some((n) => n.id === 'subgraph-10')).toBe(true);
  });

  it('6. Search Subgraph Name — case-insensitive partial match', () => {
    const results = searchNodes(allNodes, 'maingraph');

    expect(results.some((n) => n.id === 'subgraph-10')).toBe(true);
  });

  it('7. Search Container ID — exact match on ContainerId (no partial)', () => {
    const results = searchNodes(allNodes, '50');

    expect(results.some((n) => n.id === 'container-1-50')).toBe(true);
  });

  it('7. Search Container ID — does NOT match by partial numeric value (5 ≠ containerId 50)', () => {
    // 5 is numeric; subsystemNode has id=5 → matches subsystem, not container
    const results = searchNodes(allNodes, '5');
    expect(results.some((n) => n.id === 'container-1-50')).toBe(false);
  });

  it('8. Search Subsystem ID — exact match on SubsystemId (no partial)', () => {
    const results = searchNodes(allNodes, '5');

    expect(results.some((n) => n.id === 'subsystem-5')).toBe(true);
  });

  it('8. Search Subsystem ID — does NOT match by partial numeric value (50 ≠ subsystemId 5)', () => {
    // 50 is numeric; containerNode has containerId=50 → matches container, not subsystem
    const results = searchNodes(allNodes, '50');
    expect(results.some((n) => n.id === 'subsystem-5')).toBe(false);
  });

  it('9. Search Subsystem Name — partial match on SubsystemName', () => {
    const results = searchNodes(allNodes, 'AudioSubsystem');

    expect(results.some((n) => n.id === 'subsystem-5')).toBe(true);
  });

  it('9. Search Subsystem Name — case-insensitive partial match', () => {
    const results = searchNodes(allNodes, 'audiosubsystem');

    expect(results.some((n) => n.id === 'subsystem-5')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Highlight rules
// ---------------------------------------------------------------------------

describe('Highlight rules', () => {
  it('non-matching nodes get "none" highlight', () => {
    const matches = searchNodes(allNodes, 'mod:200');
    const activeId = matches[0]?.id ?? null;
    const annotations = annotateHighlights(allNodes, matches, activeId);

    const nonMatches = annotations.filter((a) => a.id !== 'module-100');
    nonMatches.forEach((a) => {
      expect(a.searchHighlight).toBe('none');
    });
  });

  it('first match gets "active" (orange) highlight', () => {
    const multiMatchNodes: RFNode[] = [
      {
        data: {
          alias: 'AudEnc',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioEncoder',
          moduleId: 201,
          name: 'AudioEncoder',
          subgraphId: 1,
        },
        id: 'module-101',
        position: {x: 0, y: 0},
      },
      {
        data: {
          alias: 'AudMix',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioMixer',
          moduleId: 202,
          name: 'AudioMixer',
          subgraphId: 1,
        },
        id: 'module-102',
        position: {x: 0, y: 0},
      },
      {
        data: {
          alias: 'VidDec',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'VideoDecoder',
          moduleId: 203,
          name: 'VideoDecoder',
          subgraphId: 1,
        },
        id: 'module-103',
        position: {x: 0, y: 0},
      },
    ];

    // 'Audio' matches module-101 and module-102 (partial name match)
    const matches = searchNodes(multiMatchNodes, 'mod:Audio');
    expect(matches).toHaveLength(2);

    const activeId = matches[0]?.id ?? null;
    const annotations = annotateHighlights(multiMatchNodes, matches, activeId);

    // First match → active (orange)
    expect(
      annotations.find((a) => a.id === matches[0].id)?.searchHighlight,
    ).toBe('active');
    // Second match → match (yellow)
    expect(
      annotations.find((a) => a.id === matches[1].id)?.searchHighlight,
    ).toBe('match');
    // Non-matching node → none
    expect(
      annotations.find((a) => a.id === 'module-103')?.searchHighlight,
    ).toBe('none');
  });

  it('when there is only one match it gets "active" highlight', () => {
    const matches = searchNodes(allNodes, 'mod:200');
    const activeId = matches[0]?.id ?? null;
    const annotations = annotateHighlights(allNodes, matches, activeId);

    expect(
      annotations.find((a) => a.id === 'module-100')?.searchHighlight,
    ).toBe('active');
  });

  it('when there are no matches all nodes get "none" highlight', () => {
    const matches = searchNodes(allNodes, 'mod:999');
    const activeId = matches[0]?.id ?? null;
    const annotations = annotateHighlights(allNodes, matches, activeId);

    annotations.forEach((a) => {
      expect(a.searchHighlight).toBe('none');
    });
  });
});

// ---------------------------------------------------------------------------
// Navigation — Next / Previous cycling
// ---------------------------------------------------------------------------

describe('Navigation — Next / Previous cycling', () => {
  /**
   * These helpers mirror the index arithmetic in GraphDesigner.
   */
  const getNextIndex = (current: number, total: number): number =>
    (current + 1) % total;

  const getPrevIndex = (current: number, total: number): number =>
    (current - 1 + total) % total;

  it('Chevron Down / Next — advances to the next match index', () => {
    expect(getNextIndex(0, 3)).toBe(1);
    expect(getNextIndex(1, 3)).toBe(2);
  });

  it('Chevron Up / Previous — moves to the previous match index', () => {
    expect(getPrevIndex(2, 3)).toBe(1);
    expect(getPrevIndex(1, 3)).toBe(0);
  });

  it('Next at last match wraps around to first match (index 0)', () => {
    expect(getNextIndex(2, 3)).toBe(0); // last index (2) → wraps to 0
  });

  it('Previous at first match wraps around to last match', () => {
    expect(getPrevIndex(0, 3)).toBe(2); // first index (0) → wraps to last (2)
  });

  it('active highlight moves to the new index after Next', () => {
    const multiMatchNodes: RFNode[] = [
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioEncoder',
          moduleId: 201,
          name: 'AudioEncoder',
          subgraphId: 1,
        },
        id: 'module-101',
        position: {x: 0, y: 0},
      },
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioMixer',
          moduleId: 202,
          name: 'AudioMixer',
          subgraphId: 1,
        },
        id: 'module-102',
        position: {x: 0, y: 0},
      },
    ];

    const matches = searchNodes(multiMatchNodes, 'mod:Audio');
    expect(matches).toHaveLength(2);

    // Initial state: index 0 is active
    let currentIndex = 0;
    let annotations = annotateHighlights(
      multiMatchNodes,
      matches,
      matches[currentIndex].id,
    );
    expect(
      annotations.find((a) => a.id === matches[0].id)?.searchHighlight,
    ).toBe('active');
    expect(
      annotations.find((a) => a.id === matches[1].id)?.searchHighlight,
    ).toBe('match');

    // Press Next → index 1 becomes active
    currentIndex = getNextIndex(currentIndex, matches.length);
    annotations = annotateHighlights(
      multiMatchNodes,
      matches,
      matches[currentIndex].id,
    );
    expect(
      annotations.find((a) => a.id === matches[0].id)?.searchHighlight,
    ).toBe('match');
    expect(
      annotations.find((a) => a.id === matches[1].id)?.searchHighlight,
    ).toBe('active');
  });

  it('active highlight moves to the new index after Previous', () => {
    const multiMatchNodes: RFNode[] = [
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioEncoder',
          moduleId: 201,
          name: 'AudioEncoder',
          subgraphId: 1,
        },
        id: 'module-101',
        position: {x: 0, y: 0},
      },
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioMixer',
          moduleId: 202,
          name: 'AudioMixer',
          subgraphId: 1,
        },
        id: 'module-102',
        position: {x: 0, y: 0},
      },
    ];

    const matches = searchNodes(multiMatchNodes, 'mod:Audio');

    // Start at index 1, press Previous → index 0 becomes active
    let currentIndex = 1;
    let annotations = annotateHighlights(
      multiMatchNodes,
      matches,
      matches[currentIndex].id,
    );
    expect(
      annotations.find((a) => a.id === matches[1].id)?.searchHighlight,
    ).toBe('active');

    currentIndex = getPrevIndex(currentIndex, matches.length);
    annotations = annotateHighlights(
      multiMatchNodes,
      matches,
      matches[currentIndex].id,
    );
    expect(
      annotations.find((a) => a.id === matches[0].id)?.searchHighlight,
    ).toBe('active');
    expect(
      annotations.find((a) => a.id === matches[1].id)?.searchHighlight,
    ).toBe('match');
  });

  it('reaching the last match and pressing Next starts from the first match', () => {
    const multiMatchNodes: RFNode[] = [
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioA',
          moduleId: 201,
          name: 'AudioA',
          subgraphId: 1,
        },
        id: 'module-101',
        position: {x: 0, y: 0},
      },
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioB',
          moduleId: 202,
          name: 'AudioB',
          subgraphId: 1,
        },
        id: 'module-102',
        position: {x: 0, y: 0},
      },
      {
        data: {
          alias: '',
          containerId: 1,
          controlPorts: [],
          dataPorts: [],
          kind: NODE_KIND.MODULE,
          label: 'AudioC',
          moduleId: 203,
          name: 'AudioC',
          subgraphId: 1,
        },
        id: 'module-103',
        position: {x: 0, y: 0},
      },
    ];

    const matches = searchNodes(multiMatchNodes, 'mod:Audio');
    expect(matches).toHaveLength(3);

    // Navigate to last match (index 2)
    const lastIndex = matches.length - 1;
    // Press Next from last → wraps to 0
    const wrappedIndex = getNextIndex(lastIndex, matches.length);
    expect(wrappedIndex).toBe(0);

    const annotations = annotateHighlights(
      multiMatchNodes,
      matches,
      matches[wrappedIndex].id,
    );
    expect(
      annotations.find((a) => a.id === matches[0].id)?.searchHighlight,
    ).toBe('active');
  });
});
