/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/usecases/api/usecases-api');
jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: {
    getState: jest.fn(() => ({
      selectedUsecaseIds: [],
    })),
  },
}));

import {getSubgraphsByIds} from '~entities/usecases/api/usecases-api';
import type {
  ControlLinkDto,
  DataLinkDto,
  SpfModuleDto,
} from '~entities/usecases/model/usecase-component.dto';
import {withMutationLock} from '~features/graph-designer/model/edit-session-slice';
import {createGraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';
import {createProjectStore} from '~shared/store/project-store';
import {projectStoreRegistry} from '~shared/store/project-store-registry';

import {
  makeDataLinkDto,
  makeSpfModuleDto,
  makeSubsystemDto,
} from '../test-utils/component-dto-fixtures';

const mockGetSubgraphsByIds = jest.mocked(getSubgraphsByIds);

beforeEach(() => {
  mockGetSubgraphsByIds.mockResolvedValue({
    data: [],
    message: undefined,
    success: true,
  });
});

describe('GraphDesignerStore — EditSessionSlice composition', () => {
  it('composes EditSessionSlice with correct initial state and methods', () => {
    const store = createGraphDesignerStore('tab-1', 'proj-1');
    const state = store.getState();

    // Initial state assertions
    expect(state.mode).toBe('view');
    expect(state.isMutating).toBe(false);
    expect(state.usesSubsystemVariant).toBe(false);
    expect(state.kvSelectionsById).toEqual({});
    expect(state.excludedLinks).toEqual([]);
    expect(state.pairLinksById).toEqual({});
    expect(state.subgraphProvenanceById).toEqual({});

    // Method assertions
    expect(typeof state.beginMutation).toBe('function');
    expect(typeof state.endMutation).toBe('function');
    expect(typeof state.enterEditMode).toBe('function');
    expect(typeof state.exitEditMode).toBe('function');
    expect(typeof state.resetSessionLocalMaps).toBe('function');
  });
});

describe('createGraphDesignerStore — exclusive lock across two tabs on the same project', () => {
  afterEach(() => {
    projectStoreRegistry.clear();
  });

  it('blocks a second tab on the same project while the first tab holds edit mode, then allows it once the first tab exits', () => {
    projectStoreRegistry.register(
      'proj-shared-1',
      createProjectStore('proj-shared-1'),
    );
    const tabA = createGraphDesignerStore('tab-a', 'proj-shared-1');
    const tabB = createGraphDesignerStore('tab-b', 'proj-shared-1');

    const firstTabAcquired = tabA.getState().enterEditMode();
    const secondTabAcquired = tabB.getState().enterEditMode();

    expect(firstTabAcquired).toBe(true);
    expect(secondTabAcquired).toBe(false);
    expect(tabA.getState().mode).toBe('edit');
    expect(tabB.getState().mode).toBe('view');
    expect(
      projectStoreRegistry.get('proj-shared-1')?.getState().activeExclusiveMode,
    ).toBe('usecase-edit');

    tabA.getState().exitEditMode();
    const secondTabAcquiredAfterExit = tabB.getState().enterEditMode();

    expect(secondTabAcquiredAfterExit).toBe(true);
    expect(tabB.getState().mode).toBe('edit');
    expect(tabA.getState().mode).toBe('view');
  });
});

describe('createGraphDesignerStore — full edit-session round-trip through a mixed mutation response', () => {
  it('reconciles a mixed create/delete response spanning modules, links, and subsystems inside one edit session', async () => {
    projectStoreRegistry.register(
      'proj-e2e-1',
      createProjectStore('proj-e2e-1'),
    );
    const store = createGraphDesignerStore('tab-e2e', 'proj-e2e-1');
    store.setState({
      excludedLinks: [
        {
          connectionId: 'link-old',
          connectionType: 'data',
          fromModuleId: 'mod-A',
          fromPortId: '11',
          toModuleId: 'ss-1',
          toPortId: '90',
        },
      ],
      graphData: {
        connections: [
          {
            connectionId: 'link-old',
            connectionType: 'data',
            fromModuleId: 'mod-A',
            fromPortId: '11',
            toModuleId: 'ss-1',
            toPortId: '90',
          },
        ],
        containers: {},
        moduleInstances: {
          'mod-A': {
            containerId: 'c1',
            displayName: 'Mod A',
            inputPorts: [],
            moduleId: '100',
            moduleInstanceId: 'mod-A',
            moduleName: 'Mod A',
            moduleType: 'SOURCE',
            outputPorts: [
              {
                direction: 'output',
                isStatic: false,
                portId: '11',
                portName: 'out1',
                portType: 'data',
                totalLinksAtPort: 1,
              },
              {
                direction: 'output',
                isStatic: false,
                portId: '12',
                portName: 'out2',
                portType: 'data',
                totalLinksAtPort: 0,
              },
            ],
            position: {x: 0, y: 0},
            subgraphId: 'sg-1',
          },
        },
        selectedUsecases: [],
        subgraphs: {},
        subsystems: {
          'ss-1': {
            controlPorts: [],
            dataPorts: [],
            subgraphs: ['sg-1'],
            subsystemId: 'ss-1',
            subsystemName: 'Subsystem 1',
          },
        },
      },
      moduleList: [
        {
          builtIn: false,
          category: '',
          description: '',
          dspType: '',
          inputPorts: [],
          moduleId: '300',
          moduleName: 'Mod B',
          moduleType: 'SINK',
          outputPorts: [],
        },
      ],
      pairLinksById: {
        'sg-1:sg-1': {
          controlLinks: [],
          dataLinks: [makeDataLinkDto({systemId: 'link-old'})],
          destinationSubgraphSystemId: 'sg-1',
          sourceSubgraphSystemId: 'sg-1',
        },
      },
    });

    const entered = store.getState().enterEditMode();
    expect(entered).toBe(true);
    expect(store.getState().mode).toBe('edit');

    const empty = {
      controlLinks: [] as ControlLinkDto[],
      dataLinks: [] as DataLinkDto[],
      spfModules: [] as SpfModuleDto[],
    };

    await withMutationLock(store.getState, async () => {
      await store.getState().applyComponentCollection({
        added: {
          ...empty,
          dataLinks: [
            makeDataLinkDto({
              destinationId: 'mod-B',
              destinationPortId: '21',
              sourceId: 'mod-A',
              sourcePortId: '12',
              systemId: 'link-new',
            }),
          ],
          spfModules: [
            makeSpfModuleDto({
              containerId: 20,
              dataPorts: [
                {
                  name: 'in1',
                  portIoType: 'Input',
                  portType: 'Dynamic',
                  systemId: '21',
                  totalLinksAtPort: 0,
                } as never,
              ],
              id: 2,
              moduleId: 300,
              name: 'Mod B',
              subgraphId: '2',
              systemId: 'mod-B',
            }),
          ],
        },
        deleted: {
          ...empty,
          dataLinks: [
            makeDataLinkDto({
              destinationId: 'ss-1',
              destinationPortId: '90',
              sourceId: 'mod-A',
              sourcePortId: '11',
              systemId: 'link-old',
            }),
          ],
          subsystems: [makeSubsystemDto({id: 50, systemId: 'ss-1'})],
        },
        updated: empty,
      });
    });

    expect(store.getState().isMutating).toBe(false);

    const state = store.getState();
    const graphData = state.graphData!;

    // Pure-create half: the new module and its link exist.
    expect(graphData.moduleInstances['mod-B']).toBeDefined();
    expect(graphData.moduleInstances['mod-B'].moduleType).toBe('SINK');
    expect(
      graphData.connections.find((c) => c.connectionId === 'link-new'),
    ).toEqual({
      connectionId: 'link-new',
      connectionType: 'data',
      fromModuleId: 'mod-A',
      fromPortId: '12',
      toModuleId: 'mod-B',
      toPortId: '21',
    });

    // Pure-delete half: the old link and the subsystem it terminated at are gone.
    expect(
      graphData.connections.find((c) => c.connectionId === 'link-old'),
    ).toBeUndefined();
    expect(graphData.subsystems['ss-1']).toBeUndefined();

    // recomputeContainersAndSubgraphs re-derived containers/subgraphs.
    expect(Object.keys(graphData.containers).sort()).toEqual(['20', 'c1']);
    expect(Object.keys(graphData.subgraphs).sort()).toEqual(['2', 'sg-1']);

    // pruneDeletedLinkBookkeeping dropped the deleted link's bookkeeping.
    expect(state.pairLinksById['sg-1:sg-1']).toBeUndefined();
    expect(state.excludedLinks).toEqual([]);

    // adjustSurvivingPortCounts moved port counts correctly.
    const modA = graphData.moduleInstances['mod-A'];
    expect(
      modA.outputPorts.find((p) => p.portId === '11')?.totalLinksAtPort,
    ).toBe(0);
    expect(
      modA.outputPorts.find((p) => p.portId === '12')?.totalLinksAtPort,
    ).toBe(1);
    expect(
      graphData.moduleInstances['mod-B'].inputPorts[0].totalLinksAtPort,
    ).toBe(1);

    store.getState().exitEditMode();

    expect(store.getState().mode).toBe('view');
    expect(
      projectStoreRegistry.get('proj-e2e-1')?.getState().activeExclusiveMode,
    ).toBe('none');
  });
});
