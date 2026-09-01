/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {NODE_KIND} from '~entities/graph';
import {
  DELETE_HANDLERS,
  DELETE_HANDLERS_INNER,
  resolveGraphDesignerNodeId,
} from '~features/graph-designer/lib/delete-handlers';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';

function makeStore(
  overrides: Partial<GraphDesignerStore> = {},
): GraphDesignerStore {
  return {
    deleteContainer: jest.fn().mockResolvedValue(true),
    deleteContainerInner: jest.fn().mockResolvedValue(true),
    deleteLink: jest.fn().mockResolvedValue(true),
    deleteLinkInner: jest.fn().mockResolvedValue(true),
    deleteModuleInstance: jest.fn().mockResolvedValue(true),
    deleteModuleInstanceInner: jest.fn().mockResolvedValue(true),
    deleteSubgraph: jest.fn().mockResolvedValue(true),
    deleteSubgraphInner: jest.fn().mockResolvedValue(true),
    deleteSubsystem: jest.fn().mockResolvedValue(true),
    deleteSubsystemInner: jest.fn().mockResolvedValue(true),
    excludedLinks: [],
    excludeLink: jest.fn(),
    expandSubsystem: jest.fn().mockResolvedValue(true),
    graphData: {
      connections: [],
      containers: {},
      moduleInstances: {},
      selectedUsecases: [],
      subgraphs: {},
      subsystems: {},
    },
    mode: 'edit',
    moveToSubsystem: jest.fn().mockResolvedValue(true),
    pairLinksById: {},
    renameSubgraph: jest.fn().mockResolvedValue(undefined),
    renameSubsystemNode: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as GraphDesignerStore;
}

describe('delete-handlers', () => {
  it('dispatches node delete through the matching handler', async () => {
    const store = makeStore();
    await DELETE_HANDLERS.module(() => store, 'module-1');
    expect(store.deleteModuleInstance).toHaveBeenCalledWith(
      expect.any(Function),
      'module-1',
    );
  });

  it('dispatches lock-free delete through the matching inner handler', async () => {
    const store = makeStore();
    await DELETE_HANDLERS_INNER.module(() => store, 'module-1', {
      suppressToast: true,
    });
    expect(store.deleteModuleInstanceInner).toHaveBeenCalledWith(
      expect.any(Function),
      'module-1',
      {suppressToast: true},
    );
  });

  it('resolves graph-designer node ids from system metadata', () => {
    expect(
      resolveGraphDesignerNodeId({
        node: {
          height: 1,
          id: 'subgraph-visual',
          label: 'SG',
          meta: {subgraphSystemId: 'sg-1', systemId: 'sg-1'},
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphId: 1,
          width: 1,
          x: 0,
          y: 0,
        },
      }),
    ).toBe('sg-1');
  });

  it('falls back to visualizer node id without system metadata', () => {
    expect(
      resolveGraphDesignerNodeId({
        node: {
          height: 1,
          id: 'subgraph-visual',
          label: 'SG',
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphId: 1,
          width: 1,
          x: 0,
          y: 0,
        },
      }),
    ).toBe('subgraph-visual');
  });
});
