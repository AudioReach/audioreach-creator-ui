/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView, ModuleNode} from '~entities/graph';
import {applyPpHighlight} from '~widgets/graph-designer/lib/apply-pp-highlight';

function moduleNode(id: string, moduleId: number, def: string): ModuleNode {
  return {
    height: 80,
    id,
    label: id,
    moduleDefinitionSystemId: def,
    moduleId,
    moduleType: 'Mod',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
  };
}

function baseLevel(): LevelView {
  return {
    dataLinks: [
      {
        edgeKind: 'data',
        id: 'd-1',
        sourceNodeId: 'module-1',
        sourcePortId: 'out-1',
        targetNodeId: 'module-2',
        targetPortId: 'in-1',
      },
    ],
    levelId: 'top',
    modules: [
      moduleNode('module-1', 0x403d, 'def-pp'),
      moduleNode('module-2', 2, 'def-other'),
    ],
  };
}

describe('applyPpHighlight', () => {
  // Empty set: nothing to highlight, no-op — same LevelView reference returned
  it('returns the same reference when ppModuleDefinitionIds is empty', () => {
    const level = baseLevel();
    expect(applyPpHighlight(level, new Set())).toBe(level);
  });

  // Matches on definition system id; instance id (IID 0x403d) is irrelevant
  it('stamps isPpModule: true on modules whose definition is in the set', () => {
    const out = applyPpHighlight(baseLevel(), new Set(['def-pp']));

    const m1 = out.modules?.find((m) => m.id === 'module-1');
    const m2 = out.modules?.find((m) => m.id === 'module-2');
    expect(m1?.isPpModule).toBe(true);
    expect(m2?.isPpModule).toBeUndefined();
  });

  // A module not in the set is returned as the same object reference — only
  // matching modules get a new object.
  it('returns an unmatched module as the same object reference', () => {
    const level = baseLevel();
    const originalM2 = level.modules?.find((m) => m.id === 'module-2');

    const out = applyPpHighlight(level, new Set(['def-pp']));
    const m2 = out.modules?.find((m) => m.id === 'module-2');

    expect(m2).toBe(originalM2);
  });

  // Non-module fields must pass through untouched
  it('leaves dataLinks and other non-module fields untouched', () => {
    const level = baseLevel();
    const out = applyPpHighlight(level, new Set(['def-pp']));

    expect(out.dataLinks).toBe(level.dataLinks);
    expect(out.levelId).toBe('top');
  });

  // An instance id equal to a set member must not match: ids are different
  it('does not match on instance id', () => {
    const out = applyPpHighlight(baseLevel(), new Set(['16445']));
    expect(out.modules?.some((m) => m.isPpModule)).toBe(false);
  });
});
