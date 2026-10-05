/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView} from '~entities/graph';
import {applyLinkVisibility} from '~widgets/graph-designer/lib/apply-link-visibility';

function baseLevel(): LevelView {
  return {
    controlLinks: [
      {
        edgeKind: 'control',
        id: 'control-normal',
        isInterUsecase: false,
        sourceNodeId: 'module-1',
        sourcePortId: 'ctrl-out',
        targetNodeId: 'module-2',
        targetPortId: 'ctrl-in',
      },
      {
        edgeKind: 'control',
        id: 'control-interUsecase',
        isInterUsecase: true,
        sourceNodeId: 'module-1',
        sourcePortId: 'ctrl-out-2',
        targetNodeId: 'module-2',
        targetPortId: 'ctrl-in-2',
      },
    ],
    dataLinks: [
      {
        edgeKind: 'data',
        id: 'data-normal',
        isInterUsecase: false,
        sourceNodeId: 'module-1',
        sourcePortId: 'out-1',
        targetNodeId: 'module-2',
        targetPortId: 'in-1',
      },
      {
        edgeKind: 'data',
        id: 'data-interUsecase',
        isInterUsecase: true,
        sourceNodeId: 'module-1',
        sourcePortId: 'out-2',
        targetNodeId: 'module-2',
        targetPortId: 'in-2',
      },
    ],
    levelId: 'top',
    proxyControlLinks: [
      {
        edgeKind: 'proxy-control',
        id: 'proxy-c-1',
        sourceNodeId: 'module-3',
        sourcePortId: 'p-ctrl',
        targetNodeId: 'subgraph-proxy-1',
        targetPortId: 'proxy-target',
      },
    ],
    proxyDataLinks: [
      {
        edgeKind: 'proxy-data',
        id: 'proxy-d-1',
        sourceNodeId: 'module-3',
        sourcePortId: 'p-data',
        targetNodeId: 'subgraph-proxy-1',
        targetPortId: 'proxy-target',
      },
    ],
  };
}

describe('applyLinkVisibility', () => {
  // Both flags on: every link visible, no-op — same LevelView reference returned
  it('returns the same reference when both flags are true', () => {
    const level = baseLevel();
    expect(applyLinkVisibility(level, true, true)).toBe(level);
  });

  // Show Control Links off: every control link hidden regardless of interUsecase state
  it('removes every control link when showControlLinks is false', () => {
    const out = applyLinkVisibility(baseLevel(), false, true);

    expect(out.controlLinks).toEqual([]);
    expect(out.dataLinks?.map((l) => l.id).sort()).toEqual([
      'data-interUsecase',
      'data-normal',
    ]);
  });

  // Show InterUsecase Links off: every interUsecase link (data or control) hidden regardless of type
  it('removes every interUsecase link when showInterUsecaseLinks is false', () => {
    const out = applyLinkVisibility(baseLevel(), true, false);

    expect(out.controlLinks?.map((l) => l.id)).toEqual(['control-normal']);
    expect(out.dataLinks?.map((l) => l.id)).toEqual(['data-normal']);
  });

  // Both off: only the non-interUsecase data link survives
  it('leaves only non-interUsecase data links when both flags are false', () => {
    const out = applyLinkVisibility(baseLevel(), false, false);

    expect(out.controlLinks).toEqual([]);
    expect(out.dataLinks?.map((l) => l.id)).toEqual(['data-normal']);
  });

  // A level with no dataLinks/controlLinks keys must not throw, filters to empty arrays
  it('filters to empty arrays without throwing when dataLinks/controlLinks are absent', () => {
    const level: LevelView = {levelId: 'top'};

    expect(() => applyLinkVisibility(level, false, false)).not.toThrow();
    expect(applyLinkVisibility(level, false, false)).toEqual({
      controlLinks: [],
      dataLinks: [],
      levelId: 'top',
    });
  });

  // Proxy links are never touched by this filter — they're synthesized downstream
  it('leaves proxyDataLinks and proxyControlLinks unchanged', () => {
    const level = baseLevel();
    const out = applyLinkVisibility(level, false, false);

    expect(out.proxyDataLinks).toBe(level.proxyDataLinks);
    expect(out.proxyControlLinks).toBe(level.proxyControlLinks);
  });
});
