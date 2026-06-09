/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {captureScreenshot} from '~features/usecase-visualizer/lib/capture-screenshot';

const mockToPng = jest.fn();
const mockGetNodesBounds = jest.fn();
const mockGetViewportForBounds = jest.fn();
const mockLoggerWarn = jest.fn();

jest.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => mockToPng(...args),
}));

jest.mock('@xyflow/react', () => ({
  getNodesBounds: (...args: unknown[]) => mockGetNodesBounds(...args),
  getViewportForBounds: (...args: unknown[]) =>
    mockGetViewportForBounds(...args),
}));

jest.mock('~shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
}));

jest.useFakeTimers();

function makeEl(bgColor = ''): HTMLElement {
  const el = document.createElement('div');
  jest.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: (prop: string) =>
      prop === '--color-background-neutral-01' ? bgColor : '',
  } as unknown as CSSStyleDeclaration);
  return el;
}

function makeInstance(nodeCount: number): {getNodes: jest.Mock} {
  const nodes = Array.from({length: nodeCount}, (_, i) => ({id: `n-${i}`}));
  return {getNodes: jest.fn(() => nodes)};
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetNodesBounds.mockReturnValue({height: 400, width: 800, x: 0, y: 0});
  mockGetViewportForBounds.mockReturnValue({x: 10, y: 20, zoom: 1.0});
  mockToPng.mockResolvedValue('data:image/png;base64,abc123');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('captureScreenshot', () => {
  it('returns null when there are no nodes', async () => {
    const instance = makeInstance(0);
    const el = makeEl();
    const promise = captureScreenshot(instance, el);
    jest.runAllTimers();
    const result = await promise;
    expect(result).toBeNull();
    expect(mockToPng).not.toHaveBeenCalled();
  });

  it('calls toPng and returns the data URL when nodes exist', async () => {
    const instance = makeInstance(2);
    const el = makeEl('#1a1a1a');
    const promise = captureScreenshot(instance, el);
    jest.runAllTimers();
    const result = await promise;
    expect(mockToPng).toHaveBeenCalledTimes(1);
    expect(result).toBe('data:image/png;base64,abc123');
  });

  it('returns null gracefully when toPng throws', async () => {
    mockToPng.mockRejectedValueOnce(new Error('canvas error'));
    const instance = makeInstance(1);
    const el = makeEl();
    const promise = captureScreenshot(instance, el);
    jest.runAllTimers();
    const result = await promise;
    expect(result).toBeNull();
  });

  it('passes resolved QUI token bg color to toPng', async () => {
    const instance = makeInstance(1);
    const el = makeEl('  #0d0d0d  ');
    const promise = captureScreenshot(instance, el);
    jest.runAllTimers();
    await promise;
    const callArgs = mockToPng.mock.calls[0][1] as {backgroundColor?: string};
    expect(callArgs.backgroundColor).toBe('#0d0d0d');
  });

  it('returns null and warns when the CSS token does not resolve', async () => {
    const instance = makeInstance(1);
    const el = makeEl('');
    const promise = captureScreenshot(instance, el);
    jest.runAllTimers();
    const result = await promise;
    expect(result).toBeNull();
    expect(mockToPng).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('--color-background-neutral-01'),
      expect.objectContaining({component: 'captureScreenshot'}),
    );
  });
});
