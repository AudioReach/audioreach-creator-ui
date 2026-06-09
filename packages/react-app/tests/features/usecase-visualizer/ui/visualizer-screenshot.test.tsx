/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';

import type {LevelView} from '~features/usecase-visualizer/model/visualizer.types';
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

jest.mock('~features/usecase-visualizer/lib/capture-screenshot', () => ({
  captureScreenshot: jest.fn().mockResolvedValue('data:image/png;base64,test'),
}));

jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeGraph(overrides: Partial<LevelView> = {}): LevelView {
  return {levelId: 'root', ...overrides};
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

describe('onScreenshotApiReady', () => {
  it('fires onScreenshotApiReady once after mount with a capture function', () => {
    const onScreenshotApiReady = jest.fn();

    render(
      <UsecaseVisualizer
        graph={makeGraph()}
        onScreenshotApiReady={onScreenshotApiReady}
      />,
    );

    expect(onScreenshotApiReady).toHaveBeenCalledTimes(1);
    expect(typeof onScreenshotApiReady.mock.calls[0][0]).toBe('function');
  });

  it('does not call onScreenshotApiReady again on re-render', () => {
    const onScreenshotApiReady = jest.fn();
    const {rerender} = render(
      <UsecaseVisualizer
        graph={makeGraph()}
        onScreenshotApiReady={onScreenshotApiReady}
      />,
    );

    rerender(
      <UsecaseVisualizer
        graph={makeGraph({levelId: 'level-2'})}
        onScreenshotApiReady={onScreenshotApiReady}
      />,
    );

    expect(onScreenshotApiReady).toHaveBeenCalledTimes(1);
  });

  it('capture function returns null when viewport element is not found', async () => {
    let captureFn: (() => Promise<string | null>) | undefined;
    const onScreenshotApiReady = jest.fn((fn: () => Promise<string | null>) => {
      captureFn = fn;
    });

    render(
      <UsecaseVisualizer
        graph={makeGraph()}
        onScreenshotApiReady={onScreenshotApiReady}
      />,
    );

    // The containerRef points to the real container, but there's no
    // .react-flow__viewport element in jsdom, so capture returns null.
    expect(captureFn).toBeDefined();
    const result = await captureFn!();
    expect(result).toBeNull();
  });

  it('capture function returns null after the component unmounts', async () => {
    let captureFn: (() => Promise<string | null>) | undefined;
    const onScreenshotApiReady = jest.fn((fn: () => Promise<string | null>) => {
      captureFn = fn;
    });

    const {unmount} = render(
      <UsecaseVisualizer
        graph={makeGraph()}
        onScreenshotApiReady={onScreenshotApiReady}
      />,
    );

    unmount();

    expect(captureFn).toBeDefined();
    const result = await captureFn!();
    expect(result).toBeNull();
  });
});
