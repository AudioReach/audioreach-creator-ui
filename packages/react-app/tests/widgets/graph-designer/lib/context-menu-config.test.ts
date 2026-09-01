/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {NODE_KIND} from '~entities/graph';
import type {GraphDesignerStore} from '~features/graph-designer';
import {
  buildContextMenuConfig,
  resolveContextMenuNodeId,
  resolveEdgeLinkType,
} from '~widgets/graph-designer/lib/context-menu-config';

function makeStore(
  overrides: Partial<GraphDesignerStore> = {},
): GraphDesignerStore {
  return {
    deleteContainer: jest.fn().mockResolvedValue(true),
    deleteLink: jest.fn().mockResolvedValue(true),
    deleteModuleInstance: jest.fn().mockResolvedValue(true),
    deleteSubgraph: jest.fn().mockResolvedValue(true),
    deleteSubsystem: jest.fn().mockResolvedValue(true),
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

function configFor(store: GraphDesignerStore) {
  return buildContextMenuConfig(() => store);
}

describe('context-menu-config', () => {
  it('returns no items outside edit mode', () => {
    const config = configFor(makeStore({mode: 'view'}));
    expect(
      config.getItems({
        kind: 'module',
        node: {
          height: 1,
          id: 'module-1',
          label: 'Module',
          moduleId: 1,
          moduleType: 'COPP',
          nodeKind: NODE_KIND.MODULE,
          ports: [],
          width: 1,
          x: 0,
          y: 0,
        },
      }),
    ).toEqual([]);
  });

  it('returns port start/end items from connection state on the target', () => {
    const config = configFor(makeStore());
    const withoutConnection = config.getItems({
      connectionInProgress: false,
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'input'},
    });
    expect(withoutConnection.map((item) => item.id)).toEqual([
      'start-connection',
    ]);

    const withConnection = config.getItems({
      connectionInProgress: true,
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'input'},
    });
    expect(withConnection.map((item) => item.id)).toEqual([
      'end-connection',
    ]);
  });

  it('shows exclude-link only for pair-tracked edges', () => {
    const store = makeStore({
      pairLinksById: {
        pair: {
          controlLinks: [],
          dataLinks: [{systemId: 'link-1'}],
        },
      },
    } as Partial<GraphDesignerStore>);
    const config = configFor(store);
    const items = config.getItems({
      edge: {
        edgeKind: 'data',
        id: 'link-1',
        sourceNodeId: 'a',
        sourcePortId: 'p1',
        targetNodeId: 'b',
        targetPortId: 'p2',
      },
      kind: 'data-link',
    });
    expect(items.map((item) => item.id)).toEqual(['delete', 'exclude-link']);
  });

  it('resolves context-menu node ids from system metadata', () => {
    expect(
      resolveContextMenuNodeId({
        kind: 'subgraph',
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

  it('moves a node to the top level', () => {
    const store = makeStore();
    const config = configFor(store);

    config.onAction('move-to-subsystem', {
      kind: 'subgraph',
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
    });

    expect(store.moveToSubsystem).toHaveBeenCalledWith(
      expect.any(Function),
      'sg-1',
      null,
    );
  });

  it.each([
    ['data-link', 'data'],
    ['proxy-data-link', 'data'],
    ['control-link', 'control'],
    ['proxy-control-link', 'control'],
  ] as const)('resolves %s to %s', (kind, linkType) => {
    expect(resolveEdgeLinkType({edge: {id: 'e'} as never, kind})).toBe(
      linkType,
    );
  });
});
