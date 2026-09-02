/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';

import type {
  LevelView,
  ModuleNode,
  SearchHighlights,
} from '~features/usecase-visualizer/model/visualizer.types';
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';

import {latestReactFlowProps} from '../test-utils/xyflow-mock-factory';

const mockSetCenter = jest.fn();

jest.mock('@xyflow/react', () => {
  const base =
    require('../test-utils/xyflow-mock-factory').createXyflowMockFactory();
  // Capture stable stubs from the factory instance so they don't change
  // across renders (new references in the dep array cause an infinite loop).
  const stableFlow = base.useReactFlow();
  return {
    ...base,
    applyNodeChanges: jest.fn((_changes: unknown[], nodes: unknown[]) => nodes),
    useReactFlow: () => ({
      ...stableFlow,
      setCenter: mockSetCenter,
    }),
  };
});

jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeModule(id: string, x = 0, y = 0): ModuleNode {
  return {
    height: 100,
    id,
    label: id,
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x,
    y,
  };
}

function makeGraph(overrides: Partial<LevelView> = {}): LevelView {
  return {
    levelId: 'root',
    modules: [makeModule('m-1'), makeModule('m-2', 200, 0)],
    ...overrides,
  };
}

function getModuleShape(
  container: HTMLElement,
  nodeId: string,
): HTMLElement | null {
  return container.querySelector(
    `[data-node-id="${nodeId}"] [data-testid="module-shape-layer"]`,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  latestReactFlowProps.current = null;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── 9a — search highlights ────────────────────────────────────────────────────

describe('search highlights', () => {
  it('adds search-highlight-match class to highlighted node', () => {
    const highlights: SearchHighlights = {
      highlightedIds: ['m-1'],
    };
    const {container} = render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );

    const m1 = getModuleShape(container, 'm-1');
    const m2 = getModuleShape(container, 'm-2');
    expect(m1?.classList.contains('search-highlight-match')).toBe(true);
    expect(m2?.classList.contains('search-highlight-match')).toBe(false);
  });

  it('adds search-highlight-active class when node is both highlighted and active', () => {
    const highlights: SearchHighlights = {
      activeId: 'm-1',
      highlightedIds: ['m-1'],
    };
    const {container} = render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );

    const m1 = getModuleShape(container, 'm-1');
    // active overrides match in the store — class is search-highlight-active not
    // match
    expect(m1?.classList.contains('search-highlight-active')).toBe(true);
    expect(m1?.classList.contains('search-highlight-match')).toBe(false);
  });

  it('adds search-contains-match class to containsMatch nodes', () => {
    const highlights: SearchHighlights = {
      containsMatchNodeIds: ['m-1'],
      highlightedIds: [],
    };
    const {container} = render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );

    const m1 = getModuleShape(container, 'm-1');
    const m2 = getModuleShape(container, 'm-2');
    expect(m1?.classList.contains('search-contains-match')).toBe(true);
    expect(m2?.classList.contains('search-contains-match')).toBe(false);
  });

  it('updates highlight classes when highlightedIds change, does not call setCenter', () => {
    const highlights1: SearchHighlights = {highlightedIds: ['m-1']};
    const highlights2: SearchHighlights = {highlightedIds: ['m-2']};

    const {container, rerender} = render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights1} />,
    );
    expect(
      getModuleShape(container, 'm-1')?.classList.contains(
        'search-highlight-match',
      ),
    ).toBe(true);

    rerender(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights2} />,
    );
    expect(
      getModuleShape(container, 'm-1')?.classList.contains(
        'search-highlight-match',
      ),
    ).toBe(false);
    expect(
      getModuleShape(container, 'm-2')?.classList.contains(
        'search-highlight-match',
      ),
    ).toBe(true);
    // No activeId — setCenter must not be called
    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('removes all highlight classes when searchHighlights cleared to undefined', () => {
    const highlights: SearchHighlights = {
      containsMatchNodeIds: ['m-1'],
      highlightedIds: ['m-1'],
    };

    const {container, rerender} = render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );
    const m1 = getModuleShape(container, 'm-1');
    expect(m1?.classList.contains('search-highlight-match')).toBe(true);
    expect(m1?.classList.contains('search-contains-match')).toBe(true);

    rerender(<UsecaseVisualizer graph={makeGraph()} />);
    expect(m1?.classList.contains('search-highlight-match')).toBe(false);
    expect(m1?.classList.contains('search-contains-match')).toBe(false);
  });
});

// ── 9b — activeId snap ────────────────────────────────────────────────────────

describe('activeId snap', () => {
  it('calls setCenter with the center of the active node and correct zoom', () => {
    const highlights: SearchHighlights = {
      activeId: 'm-2',
      highlightedIds: ['m-2'],
    };
    render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );

    // m-2 is at x=200, y=0, width=160, height=100 → center = (280, 50)
    expect(mockSetCenter).toHaveBeenCalledWith(280, 50, {
      duration: 300,
      zoom: expect.any(Number),
    });
  });

  it('does not call setCenter for activeId not present in rfNodes', () => {
    const highlights: SearchHighlights = {
      activeId: 'nonexistent',
      highlightedIds: [],
    };
    render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );

    expect(mockSetCenter).not.toHaveBeenCalled();
  });

  it('does not call setCenter a second time when the same activeId is re-rendered', () => {
    const highlights: SearchHighlights = {
      activeId: 'm-1',
      highlightedIds: ['m-1'],
    };

    const {rerender} = render(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );
    const callCount = mockSetCenter.mock.calls.length;

    // Re-render with identical searchHighlights — activeId unchanged
    rerender(
      <UsecaseVisualizer graph={makeGraph()} searchHighlights={highlights} />,
    );
    expect(mockSetCenter).toHaveBeenCalledTimes(callCount);
  });
});
