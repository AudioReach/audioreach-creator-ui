/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {act, renderHook} from '@testing-library/react';

import type {Port} from '~entities/graph';
import {
  getControlLinkWithUsecases,
  getDataLinkWithUsecases,
  getModulesBySystemIds,
} from '~entities/usecases';
import {usePortConnectionsInfo} from '~features/port-connections-info/hooks/use-port-connections-info';
import {showToast} from '~shared/controls/global-toaster';

jest.mock('~entities/usecases', () => ({
  getControlLinkWithUsecases: jest.fn(),
  getDataLinkWithUsecases: jest.fn(),
  getModulesBySystemIds: jest.fn(),
}));
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

// Loosely typed (not `jest.MockedFunction<typeof ...>`) so fixtures below
// only need the fields this hook actually reads, not every DTO field.
const mockGetDataLinkWithUsecases = getDataLinkWithUsecases as jest.Mock;
const mockGetControlLinkWithUsecases = getControlLinkWithUsecases as jest.Mock;
const mockGetModulesBySystemIds = getModulesBySystemIds as jest.Mock;
const mockShowToast = showToast as jest.Mock;

function makePort(overrides: Partial<Port> = {}): Port {
  return {id: 'port-1', portIoType: 'output', ...overrides};
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolveDeferred!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });
  return {promise, resolve: resolveDeferred};
}

describe('usePortConnectionsInfo', () => {
  const projectId = 'project-1';
  const componentSystemId = 'component-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts closed', () => {
    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    expect(result.current.state).toEqual({status: 'closed'});
  });

  it('calls getDataLinkWithUsecases, not getControlLinkWithUsecases, for a non-control port, and sets loading-links synchronously', () => {
    mockGetDataLinkWithUsecases.mockReturnValue(new Promise(() => {}));
    const {result} = renderHook(() => usePortConnectionsInfo(projectId));

    act(() => {
      result.current.open(
        componentSystemId,
        makePort({id: 'port-1', portIoType: 'output'}),
      );
    });

    expect(mockGetDataLinkWithUsecases).toHaveBeenCalledWith(
      projectId,
      componentSystemId,
      'port-1',
    );
    expect(mockGetControlLinkWithUsecases).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({
      componentSystemId,
      portSystemId: 'port-1',
      status: 'loading-links',
    });
  });

  it('calls getControlLinkWithUsecases, not getDataLinkWithUsecases, for a control port', () => {
    mockGetControlLinkWithUsecases.mockReturnValue(new Promise(() => {}));
    const {result} = renderHook(() => usePortConnectionsInfo(projectId));

    act(() => {
      result.current.open(
        componentSystemId,
        makePort({id: 'port-2', portIoType: 'control'}),
      );
    });

    expect(mockGetControlLinkWithUsecases).toHaveBeenCalledWith(
      projectId,
      componentSystemId,
      'port-2',
    );
    expect(mockGetDataLinkWithUsecases).not.toHaveBeenCalled();
  });

  it('close() resets state to closed', () => {
    mockGetDataLinkWithUsecases.mockReturnValue(new Promise(() => {}));
    const {result} = renderHook(() => usePortConnectionsInfo(projectId));

    act(() => {
      result.current.open(componentSystemId, makePort());
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.state).toEqual({status: 'closed'});
  });
});

describe('usePortConnectionsInfo — happy path', () => {
  const projectId = 'project-1';
  const componentSystemId = 'component-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves loading-links -> loading-modules -> ready, deduplicating the other-end module lookup', async () => {
    const links = [
      {
        link: {
          destinationId: 'mod-B',
          destinationPortId: 'p-2',
          sourceId: componentSystemId,
          sourcePortId: 'p-1',
          systemId: 'link-1',
        },
        usecases: [],
      },
      {
        // Same other-end module as link-1 — must collapse to one lookup id.
        link: {
          destinationId: 'mod-B',
          destinationPortId: 'p-3',
          sourceId: componentSystemId,
          sourcePortId: 'p-1',
          systemId: 'link-2',
        },
        usecases: [],
      },
      {
        link: {
          destinationId: 'mod-C',
          destinationPortId: 'p-4',
          sourceId: componentSystemId,
          sourcePortId: 'p-1',
          systemId: 'link-3',
        },
        usecases: [],
      },
    ];
    const modules = [
      {
        controlPorts: [],
        dataPorts: [
          {id: 2, systemId: 'p-2'},
          {id: 3, systemId: 'p-3'},
        ],
        id: 11,
        name: 'Module B',
        subgraphId: 'sg-1',
        systemId: 'mod-B',
      },
      {
        controlPorts: [],
        dataPorts: [{id: 4, systemId: 'p-4'}],
        id: 12,
        name: 'Module C',
        subgraphId: 'sg-2',
        systemId: 'mod-C',
      },
    ];
    mockGetDataLinkWithUsecases.mockResolvedValue({data: links, success: true});
    mockGetModulesBySystemIds.mockResolvedValue({data: modules, success: true});

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(
        componentSystemId,
        makePort({id: 'port-1', portIoType: 'output'}),
      );
    });

    expect(mockGetModulesBySystemIds).toHaveBeenCalledTimes(1);
    expect(mockGetModulesBySystemIds).toHaveBeenCalledWith(projectId, [
      'mod-B',
      'mod-C',
    ]);
    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') {
      expect(result.current.state.rows).toHaveLength(3);
      expect(result.current.state.componentSystemId).toBe(componentSystemId);
      expect(result.current.state.portSystemId).toBe('port-1');
    }
  });

  it('keeps entries sharing the same link.systemId as separate rows when they are distinct connections', async () => {
    // Real backend responses have been observed reusing the same
    // link.systemId across genuinely distinct connections (differing
    // sourceId/sourcePortId) — each must remain its own row with its
    // own usecases, never merged.
    const usecaseX = {
      changeInfo: {changeType: 'CREATE' as const},
      keyValueCollection: [],
      systemId: 'uc-x',
      usecaseType: 'Regular' as const,
    };
    const usecaseY = {
      changeInfo: {changeType: 'CREATE' as const},
      keyValueCollection: [],
      systemId: 'uc-y',
      usecaseType: 'Regular' as const,
    };
    const links = [
      {
        link: {
          destinationId: componentSystemId,
          destinationPortId: 'p-self',
          isDangling: false,
          sourceId: 'mod-B',
          sourcePortId: 'p-b1',
          systemId: 'link-1',
        },
        usecases: [usecaseX],
      },
      {
        link: {
          destinationId: componentSystemId,
          destinationPortId: 'p-self',
          isDangling: true,
          sourceId: 'mod-C',
          sourcePortId: 'p-c1',
          systemId: 'link-1',
        },
        usecases: [usecaseY],
      },
    ];
    const modules = [
      {
        controlPorts: [],
        dataPorts: [{id: 2, systemId: 'p-b1'}],
        id: 11,
        name: 'Module B',
        subgraphId: 'sg-1',
        systemId: 'mod-B',
      },
    ];
    mockGetDataLinkWithUsecases.mockResolvedValue({data: links, success: true});
    mockGetModulesBySystemIds.mockResolvedValue({data: modules, success: true});

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(
        componentSystemId,
        makePort({id: 'port-1', portIoType: 'output'}),
      );
    });

    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') {
      expect(result.current.state.rows).toHaveLength(2);
      expect(
        result.current.state.rows[0].usecases.map((u) => u.systemId),
      ).toEqual(['uc-x']);
      expect(
        result.current.state.rows[1].usecases.map((u) => u.systemId),
      ).toEqual(['uc-y']);
      expect(result.current.state.rows[0].systemId).not.toBe(
        result.current.state.rows[1].systemId,
      );
    }
  });
});

describe('usePortConnectionsInfo — failures', () => {
  const projectId = 'project-1';
  const componentSystemId = 'component-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stage-A failure toasts and returns to closed, never reaching error', async () => {
    mockGetDataLinkWithUsecases.mockResolvedValue({
      message: 'link fetch failed',
      success: false,
    });

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
    });

    expect(mockShowToast).toHaveBeenCalledWith('link fetch failed', 'danger');
    expect(mockGetModulesBySystemIds).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({status: 'closed'});
  });

  it('a stage-A failure with no message falls back to a default toast message', async () => {
    mockGetDataLinkWithUsecases.mockResolvedValue({success: false});

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      'Failed to load connections',
      'danger',
    );
  });

  it('stage-B failure transitions loading-modules to error, with the popup already open', async () => {
    const links = [
      {
        link: {
          destinationId: 'mod-B',
          destinationPortId: 'p-2',
          sourceId: componentSystemId,
          sourcePortId: 'p-1',
          systemId: 'link-1',
        },
        usecases: [],
      },
    ];
    mockGetDataLinkWithUsecases.mockResolvedValue({data: links, success: true});
    mockGetModulesBySystemIds.mockResolvedValue({
      message: 'module lookup failed',
      success: false,
    });

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
    });

    expect(result.current.state).toEqual({
      componentSystemId,
      message: 'module lookup failed',
      portSystemId: 'port-1',
      status: 'error',
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('a stage-B failure with no message falls back to a default error message', async () => {
    const links = [
      {
        link: {
          destinationId: 'mod-B',
          destinationPortId: 'p-2',
          sourceId: componentSystemId,
          sourcePortId: 'p-1',
          systemId: 'link-1',
        },
        usecases: [],
      },
    ];
    mockGetDataLinkWithUsecases.mockResolvedValue({data: links, success: true});
    mockGetModulesBySystemIds.mockResolvedValue({success: false});

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
    });

    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('Failed to load module info');
    } else {
      throw new Error('expected status to be error');
    }
  });
});

describe('usePortConnectionsInfo — race guard', () => {
  const projectId = 'project-1';
  const componentSystemId = 'component-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('discards a stale stage-A result once a second open() has superseded it', async () => {
    const first = createDeferred<{data: unknown[]; success: true}>();
    const second = createDeferred<{data: unknown[]; success: true}>();
    mockGetDataLinkWithUsecases
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    mockGetModulesBySystemIds.mockResolvedValue({data: [], success: true});

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    act(() => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
    });
    act(() => {
      result.current.open(componentSystemId, makePort({id: 'port-2'}));
    });

    await act(async () => {
      first.resolve({data: [], success: true});
      await Promise.resolve();
    });
    // The stale first request's stage-A resolution must not move state
    // away from the second, still-in-flight request's port.
    expect(result.current.state).toMatchObject({portSystemId: 'port-2'});

    await act(async () => {
      second.resolve({data: [], success: true});
      await Promise.resolve();
    });
    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') {
      expect(result.current.state.portSystemId).toBe('port-2');
    }
  });

  it('discards a stale stage-B result once a second open() has superseded it', async () => {
    mockGetDataLinkWithUsecases.mockResolvedValue({data: [], success: true});
    const firstModules = createDeferred<{data: unknown[]; success: true}>();
    const secondModules = createDeferred<{data: unknown[]; success: true}>();
    mockGetModulesBySystemIds
      .mockReturnValueOnce(firstModules.promise)
      .mockReturnValueOnce(secondModules.promise);

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    await act(async () => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
      await Promise.resolve();
    });
    await act(async () => {
      result.current.open(componentSystemId, makePort({id: 'port-2'}));
      await Promise.resolve();
    });

    await act(async () => {
      firstModules.resolve({data: [], success: true});
      await Promise.resolve();
    });
    expect(result.current.state.status).not.toBe('ready');

    await act(async () => {
      secondModules.resolve({data: [], success: true});
      await Promise.resolve();
    });
    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') {
      expect(result.current.state.portSystemId).toBe('port-2');
    }
  });

  it('close() discards a stale in-flight open() result', async () => {
    const deferred = createDeferred<{data: unknown[]; success: true}>();
    mockGetDataLinkWithUsecases.mockReturnValueOnce(deferred.promise);

    const {result} = renderHook(() => usePortConnectionsInfo(projectId));
    act(() => {
      result.current.open(componentSystemId, makePort({id: 'port-1'}));
    });
    act(() => {
      result.current.close();
    });

    await act(async () => {
      deferred.resolve({data: [], success: true});
      await Promise.resolve();
    });

    expect(result.current.state).toEqual({status: 'closed'});
  });
});
