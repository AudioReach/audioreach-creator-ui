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
  type ContextMenuConfigOptions,
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

function makeOptions(
  overrides: Partial<ContextMenuConfigOptions> = {},
): ContextMenuConfigOptions {
  return {
    onAddToManualUsecase: jest.fn(),
    onRemoveFromManualUsecase: jest.fn(),
    subsystemScoped: false,
    ...overrides,
  };
}

function configFor(store: GraphDesignerStore, options = makeOptions()) {
  return buildContextMenuConfig(() => store, options);
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

  it('returns data-port start items when no connection is active', () => {
    const config = configFor(makeStore());
    const withoutConnection = config.getItems({
      connectionInProgress: null,
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'input'},
    });
    expect(withoutConnection.map((item) => item.id)).toEqual([
      'start-connection',
      'start-ec-link',
      'start-interUsecase-data-link',
    ]);
  });

  it('returns control-port start items when no connection is active', () => {
    const config = configFor(makeStore());
    const items = config.getItems({
      connectionInProgress: null,
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'control'},
    });
    expect(items.map((item) => item.id)).toEqual([
      'start-connection',
      'start-interUsecase-control-link',
    ]);
  });

  // Verifies that Add is dispatched with the domain subgraph ID for both node forms.
  it.each([
    ['normal', 'end-connection'],
    ['EC', 'complete-ec-link'],
    ['interUsecase', 'complete-interUsecase-data-link'],
  ] as const)('returns %s data completion item', (edgeMode, itemId) => {
    const config = configFor(makeStore());
    const items = config.getItems({
      connectionInProgress: {edgeMode},
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'input'},
    });
    expect(items.map((item) => item.id)).toEqual([itemId]);
  });

  it('returns the InterUsecase control completion item for a control port', () => {
    const config = configFor(makeStore());
    const items = config.getItems({
      connectionInProgress: {edgeMode: 'interUsecase'},
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'control'},
    });
    expect(items).toEqual([
      {
        id: 'complete-interUsecase-control-link',
        label: 'Complete InterUsecase Control Link',
      },
    ]);
  });

  // Verifies that Remove is dispatched with the domain subgraph ID for both node forms.
  it.each([
    ['start-connection', {command: 'start', edgeMode: 'normal'}],
    ['start-ec-link', {command: 'start', edgeMode: 'EC'}],
    [
      'start-interUsecase-data-link',
      {command: 'start', edgeMode: 'interUsecase'},
    ],
    [
      'start-interUsecase-control-link',
      {command: 'start', edgeMode: 'interUsecase'},
    ],
    ['end-connection', {command: 'complete'}],
    ['complete-ec-link', {command: 'complete'}],
    ['complete-interUsecase-data-link', {command: 'complete'}],
    ['complete-interUsecase-control-link', {command: 'complete'}],
  ] as const)('maps %s to a connection command', (actionId, command) => {
    const config = configFor(makeStore());
    const target = {
      connectionInProgress: null,
      kind: 'port',
      nodeId: 'module-1',
      port: {id: 'port-1', portIoType: 'input'},
    } as const;

    expect(config.onAction(actionId, target)).toEqual(command);
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

  it('suppresses structural actions only for the active boundary subsystem', () => {
    const config = configFor(
      makeStore({
        activeSubsystemId: 'ss-1',
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {},
          selectedUsecases: [],
          subgraphs: {},
          subsystems: {
            'ss-1': {
              childSubsystemIds: [],
              controlPorts: [],
              dataPorts: [],
              subgraphs: [],
              subsystemId: 'ss-1',
              subsystemName: 'Boundary',
            },
          },
        },
      }),
    );

    expect(
      config.getItems({kind: 'subsystem', node: {id: 'ss-1'} as never}),
    ).toEqual([]);
    expect(
      config
        .getItems({
          connectionInProgress: null,
          kind: 'port',
          nodeId: 'ss-1',
          port: {id: 'port-1', portIoType: 'input'},
        })
        .map((item) => item.id),
    ).toEqual([
      'start-connection',
      'start-ec-link',
      'start-interUsecase-data-link',
    ]);
    expect(
      config
        .getItems({
          edge: {
            edgeKind: 'data',
            id: 'inner-link',
            sourceNodeId: 'module-1',
            sourcePortId: 'p1',
            targetNodeId: 'module-2',
            targetPortId: 'p2',
          },
          kind: 'data-link',
        })
        .map((item) => item.id),
    ).toEqual(['delete']);
  });

  // Verifies that subsystem placement actions are hidden outside scoped views.
  it('hides subsystem move actions outside subsystem-scoped mode', () => {
    const config = configFor(makeStore(), makeOptions());

    for (const target of [
      {kind: 'subgraph', node: {parentId: 'parent'} as never},
      {kind: 'subsystem', node: {id: 'ss-2', parentId: 'parent'} as never},
    ] as const) {
      const itemIds = config.getItems(target).map((item) => item.id);
      expect(itemIds).not.toContain('move-to-subsystem');
      expect(itemIds).not.toContain('remove-from-subsystem');
    }
  });

  // Verifies that scoped views expose the applicable subsystem placement actions.
  it('shows subsystem move actions in subsystem-scoped mode', () => {
    const config = configFor(makeStore(), makeOptions({subsystemScoped: true}));

    expect(
      config
        .getItems({
          kind: 'subgraph',
          node: {parentId: undefined} as never,
        })
        .map((item) => item.id),
    ).toEqual([
      'delete',
      'add-to-manual-usecase',
      'remove-from-manual-usecase',
      'move-to-subsystem',
    ]);
    expect(
      config
        .getItems({
          kind: 'subsystem',
          node: {id: 'ss-1', parentId: 'parent'} as never,
        })
        .map((item) => item.id),
    ).toEqual([
      'delete',
      'move-to-subsystem',
      'remove-from-subsystem',
      'expand',
    ]);
  });

  // Verifies that Manual Usecase actions appear only for subgraph targets.
  it('shows manual-usecase actions for subgraphs and proxies only', () => {
    const config = configFor(makeStore());
    const manualActionIds = [
      'add-to-manual-usecase',
      'remove-from-manual-usecase',
    ];

    for (const target of [
      {kind: 'subgraph', node: {} as never},
      {kind: 'subgraph-proxy', node: {} as never},
    ] as const) {
      expect(config.getItems(target).map((item) => item.id)).toEqual(
        expect.arrayContaining(manualActionIds),
      );
    }
    for (const target of [
      {kind: 'module', node: {} as never},
      {kind: 'container', node: {} as never},
    ] as const) {
      expect(config.getItems(target).map((item) => item.id)).not.toEqual(
        expect.arrayContaining(manualActionIds),
      );
    }
  });

  // Verifies that Expand uses the subsystem domain ID rather than the visual node ID.
  it('expands a subsystem using its domain subsystem id', () => {
    const store = makeStore({
      graphData: {
        connections: [],
        containers: {},
        moduleInstances: {},
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'ss-domain': {
            childSubsystemIds: [],
            controlPorts: [],
            dataPorts: [],
            subgraphs: [],
            subsystemId: 'ss-domain',
            subsystemName: 'Subsystem',
          },
        },
      },
    });
    const config = configFor(store);

    config.onAction('expand', {
      kind: 'subsystem',
      node: {
        id: 'visual-subsystem-id',
        meta: {systemId: 'ss-domain'},
        subsystemId: 'ss-domain',
      } as never,
    });

    expect(store.expandSubsystem).toHaveBeenCalledWith(
      expect.any(Function),
      'ss-domain',
    );
  });

  it.each([
    ['subgraph', 42],
    ['subgraph-proxy', 43],
  ] as const)(
    'calls the add manual-usecase handler for %s',
    (kind, subgraphId) => {
      const onAddToManualUsecase = jest.fn();
      const config = configFor(
        makeStore(),
        makeOptions({onAddToManualUsecase}),
      );

      config.onAction('add-to-manual-usecase', {
        kind,
        node: {subgraphId} as never,
      });

      expect(onAddToManualUsecase).toHaveBeenCalledTimes(1);
      expect(onAddToManualUsecase).toHaveBeenCalledWith(subgraphId);
    },
  );

  it.each([
    ['subgraph', 42],
    ['subgraph-proxy', 43],
  ] as const)(
    'calls the remove manual-usecase handler for %s',
    (kind, subgraphId) => {
      const onRemoveFromManualUsecase = jest.fn();
      const config = configFor(
        makeStore(),
        makeOptions({onRemoveFromManualUsecase}),
      );

      config.onAction('remove-from-manual-usecase', {
        kind,
        node: {subgraphId} as never,
      });

      expect(onRemoveFromManualUsecase).toHaveBeenCalledTimes(1);
      expect(onRemoveFromManualUsecase).toHaveBeenCalledWith(subgraphId);
    },
  );

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
          subgraphSystemId: 1,
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
        subgraphSystemId: 1,
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
