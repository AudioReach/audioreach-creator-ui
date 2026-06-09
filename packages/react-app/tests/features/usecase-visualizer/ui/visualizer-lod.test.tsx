/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {act, render, screen} from '@testing-library/react';

import type {
  LevelView,
  ModuleNode,
} from '~features/usecase-visualizer/model/visualizer.types';
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';

import {latestReactFlowProps} from '../test-utils/xyflow-mock-factory';

jest.mock('@xyflow/react', () => {
  const base =
    require('../test-utils/xyflow-mock-factory').createXyflowMockFactory();
  return {
    ...base,
    applyNodeChanges: jest.fn((_changes: unknown[], nodes: unknown[]) => nodes),
  };
});

jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeModule(id = 'm-1'): ModuleNode {
  return {
    height: 100,
    id,
    label: id,
    moduleId: 1,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [{id: 'in1', portIoType: 'input'}],
    width: 160,
    x: 0,
    y: 0,
  };
}

function makeGraph(overrides: Partial<LevelView> = {}): LevelView {
  return {levelId: 'root', modules: [makeModule()], ...overrides};
}

function fireMove(zoom: number) {
  act(() => {
    latestReactFlowProps.current?.onMove?.(null, {x: 0, y: 0, zoom});
  });
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

describe('LOD zoom tracking', () => {
  it('renders GhostNode when zoom drops below default threshold (0.4)', () => {
    render(<UsecaseVisualizer graph={makeGraph()} />);

    fireMove(0.3);

    expect(screen.getByTestId('ghost-node')).toBeInTheDocument();
    expect(screen.queryByTestId('module-node')).not.toBeInTheDocument();
  });

  it('renders real node when zoom is above default threshold (0.4)', () => {
    render(<UsecaseVisualizer graph={makeGraph()} />);

    fireMove(0.8);

    expect(screen.getByTestId('module-node')).toBeInTheDocument();
    expect(screen.queryByTestId('ghost-node')).not.toBeInTheDocument();
  });

  it('GhostNode renders invisible Handle elements in the DOM for edge connections', () => {
    render(<UsecaseVisualizer graph={makeGraph()} />);

    fireMove(0.3);

    const ghost = screen.getByTestId('ghost-node');
    // Handles exist as children (invisible, but in DOM so edges can connect)
    const handles = ghost.querySelectorAll('[data-handlepos]');
    expect(handles.length).toBeGreaterThan(0);
  });

  it('respects custom lodThreshold prop: zoom below threshold renders ghost', () => {
    render(<UsecaseVisualizer graph={makeGraph()} lodThreshold={0.7} />);

    // zoom 0.6 < 0.7 threshold → ghost
    fireMove(0.6);

    expect(screen.getByTestId('ghost-node')).toBeInTheDocument();
    expect(screen.queryByTestId('module-node')).not.toBeInTheDocument();
  });

  it('respects custom lodThreshold prop: zoom above threshold renders real node', () => {
    render(<UsecaseVisualizer graph={makeGraph()} lodThreshold={0.7} />);

    // zoom 0.8 > 0.7 threshold → full node
    fireMove(0.8);

    expect(screen.getByTestId('module-node')).toBeInTheDocument();
    expect(screen.queryByTestId('ghost-node')).not.toBeInTheDocument();
  });
});
