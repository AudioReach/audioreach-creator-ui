/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';

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
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
}));

function makeModule(overrides: Partial<ModuleNode> = {}): ModuleNode {
  return {
    height: 100,
    id: 'm-1',
    label: 'Gain',
    moduleId: 42,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeGraph(): LevelView {
  return {levelId: 'root', modules: [makeModule()]};
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

describe('gap-fix — rendering config wiring', () => {
  it('renders a custom footer supplied via rendering.renderNodeContent', () => {
    render(
      <UsecaseVisualizer
        graph={makeGraph()}
        rendering={{
          renderNodeContent: () => ({
            footer: <div data-testid="custom-footer">CUSTOM</div>,
          }),
        }}
      />,
    );
    expect(screen.getByTestId('custom-footer')).toBeInTheDocument();
    expect(
      screen.queryByTestId('module-default-footer'),
    ).not.toBeInTheDocument();
  });

  it('hides the instance id when nodeDisplayConfig.showModuleInstanceId is false', () => {
    render(
      <UsecaseVisualizer
        graph={makeGraph()}
        rendering={{nodeDisplayConfig: {showModuleInstanceId: false}}}
      />,
    );
    expect(screen.queryByTestId('module-instance-id')).not.toBeInTheDocument();
    expect(screen.getByTestId('module-default-footer')).toHaveTextContent(
      'Gain',
    );
  });
});
