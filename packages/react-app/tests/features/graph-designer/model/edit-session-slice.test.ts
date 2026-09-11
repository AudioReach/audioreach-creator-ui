/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Exercises SGKV ownership while a graph is editable. It covers session entry,
 * Add/Delete/selection mutations, and refresh reconciliation, especially the
 * invariant that local vectors survive a refresh for a surviving subgraph.
 */
jest.mock('~shared/lib/logger');
jest.mock('~entities/edit-session', () => ({
  endSession: jest.fn(),
  startSession: jest.fn(),
}));
jest.mock('~entities/project/api/projects-api', () => ({
  getProjectById: jest.fn(),
}));
jest.mock('~entities/key-definitions/api/key-definition-api', () => ({
  getAllKeyDefinitions: jest.fn(),
}));

import {createStore, type StoreApi} from 'zustand';

import {endSession, startSession} from '~entities/edit-session';
import {getAllKeyDefinitions} from '~entities/key-definitions/api/key-definition-api';
import {getProjectById} from '~entities/project/api/projects-api';
import type {SubgraphKvPair} from '~entities/subgraph-definitions';
import {
  createEditSessionSlice,
  type EditSessionSlice,
} from '~features/graph-designer/model/edit-session-slice';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {
  createProjectStore,
  type ProjectStore,
} from '~shared/store/project-store';
import {projectStoreRegistry} from '~shared/store/project-store-registry';

const mockEndSession = jest.mocked(endSession);
const mockGetAllKeyDefinitions = jest.mocked(getAllKeyDefinitions);
const mockStartSession = jest.mocked(startSession);
const mockGetProjectById = jest.mocked(getProjectById);

type TestEditSessionStore = EditSessionSlice & {
  graphData: UsecaseGraphData | null;
  markDirty: () => void;
};

/**
 * Builds the smallest project-scoped store that still follows production lock
 * and project-store interactions. Individual tests override only the API or
 * graph data needed for the scenario.
 */
function createTestStore(projectId = 'proj-1'): {
  projectStore: StoreApi<ProjectStore>;
  store: StoreApi<TestEditSessionStore>;
} {
  const projectStore = createProjectStore(projectId);
  projectStoreRegistry.register(projectId, projectStore);
  const store = createStore<TestEditSessionStore>((set, get) => ({
    ...createEditSessionSlice(set, get, projectId),
    graphData: null,
    markDirty: jest.fn(),
  }));
  return {projectStore, store};
}

type TestStoreWithGraphData = TestEditSessionStore;

/**
 * Adds a Graph Data snapshot for session entry and refresh reconciliation.
 * Keeping it separate makes it clear which tests need loaded graph state.
 */
function createTestStoreWithGraphData(
  graphData: UsecaseGraphData | null,
  projectId = 'proj-1',
) {
  const projectStore = createProjectStore(projectId);
  projectStoreRegistry.register(projectId, projectStore);
  const store = createStore<TestStoreWithGraphData>((set, get) => ({
    ...createEditSessionSlice(set, get, projectId),
    graphData,
    markDirty: jest.fn(),
  }));
  return {projectStore, store};
}

/**
 * Produces a minimal View-mode graph whose subgraphs have explicit SGKV lists.
 * This mirrors the data shape passed from Graph Data to Edit Session on entry.
 */
function makeGraphData(subgraphIds: string[]): UsecaseGraphData {
  const subgraphs: UsecaseGraphData['subgraphs'] = {};
  for (const subgraphId of subgraphIds) {
    subgraphs[subgraphId] = {
      containers: [],
      kvVectors: [],
      subgraphName: subgraphId,
      subgraphType: '',
      systemId: subgraphId,
    };
  }
  return {
    connections: [],
    containers: {},
    moduleInstances: {},
    selectedUsecases: [],
    subgraphs,
    subsystems: {},
  };
}

function makeKeyValue(
  naturalId: number,
  valueSystemId: string,
): SubgraphKvPair {
  return {
    keyInfo: {
      keyId: naturalId,
      keyLabel: `key${naturalId}`,
      keySystemId: `key-${naturalId}`,
    },
    valueInfo: {
      valueId: naturalId,
      valueLabel: `value${naturalId}`,
      valueSystemId,
    },
  };
}

describe('EditSessionSlice', () => {
  beforeEach(() => {
    projectStoreRegistry.clear();
    mockEndSession.mockReset();
    mockGetAllKeyDefinitions.mockReset();
    mockGetAllKeyDefinitions.mockResolvedValue({
      data: [],
      message: undefined as never,
      success: true,
    });
    mockStartSession.mockReset();
    mockGetProjectById.mockReset();
  });

  it('reconciles active subgraphs while retaining staged vector pairs', () => {
    const {store} = createTestStore();
    const retainedPairs = [makeKeyValue(1, 'value-1')];
    store.setState({
      kvSelectionsById: {
        sg1: [
          {
            isEc: false,
            isSessionAdded: true,
            keyValuePairs: retainedPairs,
            selected: false,
            systemId: 'sgkv-1',
          },
        ],
        stale: [],
      },
    });

    store.getState().updateSgKvConfigInfo({
      sg1: [
        {
          isEc: true,
          keyValuePairs: [makeKeyValue(2, 'value-2')],
          selected: true,
          systemId: 'sgkv-1',
        },
      ],
      sg3: [],
    });

    expect(store.getState().kvSelectionsById).toEqual({
      sg1: [
        {
          isEc: true,
          isSessionAdded: true,
          keyValuePairs: retainedPairs,
          selected: true,
          systemId: 'sgkv-1',
        },
      ],
      sg3: [],
    });
  });

  it('keeps the stored vector map when reconciliation metadata is unchanged', () => {
    const {store} = createTestStore();
    const vector = {
      isEc: false,
      keyValuePairs: [makeKeyValue(1, 'value-1')],
      selected: true,
      systemId: 'persisted',
    };
    store.setState({kvSelectionsById: {sg1: [vector]}});
    const existingMap = store.getState().kvSelectionsById;

    store.getState().updateSgKvConfigInfo({sg1: [vector]});

    expect(store.getState().kvSelectionsById).toBe(existingMap);
  });

  it('retains a local vector when refreshed metadata reconciles its subgraph', () => {
    const {store} = createTestStore();
    const localVector = {
      isEc: false,
      isSessionAdded: true,
      keyValuePairs: [makeKeyValue(2, 'value-2')],
      selected: true,
      systemId: 'local:key-2:value-2',
    };
    store.setState({
      kvSelectionsById: {
        sg1: [
          {
            isEc: false,
            keyValuePairs: [makeKeyValue(1, 'value-1')],
            selected: false,
            systemId: 'persisted',
          },
          localVector,
        ],
      },
    });

    store.getState().updateSgKvConfigInfo({
      sg1: [
        {
          isEc: true,
          keyValuePairs: [makeKeyValue(1, 'value-1')],
          selected: true,
          systemId: 'persisted',
        },
      ],
    });

    expect(store.getState().kvSelectionsById.sg1).toEqual([
      expect.objectContaining({
        isEc: true,
        selected: true,
        systemId: 'persisted',
      }),
      localVector,
    ]);
    expect(store.getState().kvSelectionsById.sg1[1]).toBe(localVector);
  });

  it('adds a selected local vector and rejects an order-independent duplicate', () => {
    const {store} = createTestStore();
    const pairs = [makeKeyValue(1, 'value-1'), makeKeyValue(2, 'value-2')];
    store.setState({kvSelectionsById: {sg1: []}});

    expect(store.getState().addSgKvVector('sg1', pairs)).toBe(true);
    expect(store.getState().addSgKvVector('sg1', [...pairs].reverse())).toBe(
      false,
    );
    expect(store.getState().kvSelectionsById.sg1).toEqual([
      expect.objectContaining({
        isEc: false,
        isSessionAdded: true,
        keyValuePairs: pairs,
        selected: true,
        systemId: 'local:key-1:value-1|key-2:value-2',
      }),
    ]);
    expect(store.getState().markDirty).toHaveBeenCalledTimes(1);
  });

  it('rejects a persisted vector with matching numeric IDs', () => {
    const {store} = createTestStore();
    const candidatePair = makeKeyValue(1, 'candidate-value');
    const existingPair = {
      ...candidatePair,
      keyInfo: {...candidatePair.keyInfo, keySystemId: 'persisted-key'},
      valueInfo: {
        ...candidatePair.valueInfo,
        valueSystemId: 'persisted-value',
      },
    };
    store.setState({
      kvSelectionsById: {
        sg1: [
          {
            isEc: false,
            keyValuePairs: [existingPair],
            selected: true,
            systemId: 'persisted',
          },
        ],
      },
    });

    expect(store.getState().addSgKvVector('sg1', [candidatePair])).toBe(false);
    expect(store.getState().kvSelectionsById.sg1).toHaveLength(1);
    expect(store.getState().markDirty).not.toHaveBeenCalled();
  });

  it('allows a different value under a stored key', () => {
    const {store} = createTestStore();
    const existingPair = makeKeyValue(1, 'value-1');
    const candidatePair = {
      ...makeKeyValue(1, 'value-2'),
      valueInfo: {
        ...makeKeyValue(1, 'value-2').valueInfo,
        valueId: 2,
      },
    };
    store.setState({
      kvSelectionsById: {
        sg1: [
          {
            isEc: false,
            keyValuePairs: [existingPair],
            selected: true,
            systemId: 'persisted',
          },
        ],
      },
    });

    expect(store.getState().addSgKvVector('sg1', [candidatePair])).toBe(true);
    expect(store.getState().kvSelectionsById.sg1).toHaveLength(2);
  });

  it('marks dirty only when selection changes and deletes only session-added vectors', () => {
    const {store} = createTestStore();
    store.setState({
      kvSelectionsById: {
        sg1: [
          {
            isEc: false,
            keyValuePairs: [],
            selected: false,
            systemId: 'persisted',
          },
          {
            isEc: false,
            isSessionAdded: true,
            keyValuePairs: [],
            selected: true,
            systemId: 'local:session',
          },
        ],
      },
    });

    store.getState().setSgKvVectorSelected('sg1', 'persisted', false);
    store.getState().setSgKvVectorSelected('sg1', 'persisted', true);
    store.getState().deleteSgKvVector('sg1', 'persisted');
    store.getState().deleteSgKvVector('sg1', 'local:session');

    expect(store.getState().kvSelectionsById.sg1).toEqual([
      expect.objectContaining({selected: true, systemId: 'persisted'}),
    ]);
    expect(store.getState().markDirty).toHaveBeenCalledTimes(2);
  });

  it('clears session-local maps when exiting edit mode', async () => {
    const {store} = createTestStore();
    mockStartSession.mockResolvedValue({
      data: {projectId: 'proj-1', sessionMode: 'TUNING', summary: 'ok'},
      message: 'ok',
      success: true,
    });

    store.setState({
      availableGraphKeys: [
        {
          enumMember: '',
          enumName: '',
          graphKeyEnumMember: '',
          isCalibrationKey: false,
          isDynamic: false,
          isGraphKey: true,
          isVoice: false,
          name: 'DeviceTX',
          naturalId: 1,
          systemId: 'key-1',
          values: [],
        },
      ],
      excludedLinks: [
        {
          destinationPortSystemId: 'p2',
          destinationSystemId: 'm2',
          linkKind: 'data',
          linkType: 'NORMAL',
          sourcePortSystemId: 'p1',
          sourceSystemId: 'm1',
          systemId: 'c1',
        },
      ],
      kvSelectionsById: {
        sg1: [{isEc: false, keyValuePairs: [], selected: true, systemId: 's1'}],
      },
      pairLinksById: {
        sg1: {
          controlLinks: [],
          dataLinks: [],
          destinationSubgraphSystemId: 'sg2',
          sourceSubgraphSystemId: 'sg1',
        },
      },
      subgraphProvenanceById: {sg1: 'newly-created'},
    });

    await store.getState().exitEditMode();

    const state = store.getState();
    expect(state.availableGraphKeys).toBeNull();
    expect(state.mode).toBe('view');
    expect(state.kvSelectionsById).toEqual({});
    expect(state.excludedLinks).toEqual([]);
    expect(state.pairLinksById).toEqual({});
    expect(state.subgraphProvenanceById).toEqual({});
  });

  it('does not carry session-local state from a prior session into a new one', async () => {
    const {store} = createTestStore();
    mockEndSession.mockResolvedValue({
      data: {projectId: 'proj-1', sessionMode: 'READONLY', summary: 'ok'},
    });
    mockStartSession.mockResolvedValue({
      data: {projectId: 'proj-1', sessionMode: 'DESIGNER', summary: 'ok'},
      message: 'ok',
      success: true,
    });

    await store.getState().enterEditMode();
    store.setState({
      kvSelectionsById: {
        sg1: [{isEc: false, keyValuePairs: [], selected: true, systemId: 's1'}],
      },
    });
    await store.getState().exitEditMode();

    await store.getState().enterEditMode();

    expect(store.getState().kvSelectionsById).toEqual({});
  });

  it('releases the exclusive lock when exiting edit mode', async () => {
    const {projectStore, store} = createTestStore();
    projectStore.getState().setActiveExclusiveMode('usecase-edit');
    mockStartSession.mockResolvedValue({
      data: {projectId: 'proj-1', sessionMode: 'TUNING', summary: 'ok'},
      message: 'ok',
      success: true,
    });

    await store.getState().exitEditMode();

    expect(projectStore.getState().activeExclusiveMode).toBe('none');
  });

  describe('stagedProcessedChangeIds', () => {
    it('initializes to empty array', () => {
      const {store} = createTestStore();

      expect(store.getState().stagedProcessedChangeIds).toEqual([]);
    });

    it('recordStageProcessed unions in new ids from empty state', () => {
      const {store} = createTestStore();

      store.getState().recordStageProcessed(['a', 'b']);

      expect(store.getState().stagedProcessedChangeIds).toEqual(['a', 'b']);
    });

    it('recordStageProcessed preserves order and deduplicates', () => {
      const {store} = createTestStore();

      store.getState().recordStageProcessed(['a', 'b']);
      store.getState().recordStageProcessed(['b', 'c']);

      expect(store.getState().stagedProcessedChangeIds).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('clearStageProcessed resets to empty array', () => {
      const {store} = createTestStore();

      store.getState().recordStageProcessed(['a']);
      store.getState().clearStageProcessed();

      expect(store.getState().stagedProcessedChangeIds).toEqual([]);
    });

    it('resetSessionLocalMaps clears stagedProcessedChangeIds', () => {
      const {store} = createTestStore();

      store.getState().recordStageProcessed(['a', 'b']);
      store.getState().resetSessionLocalMaps();

      expect(store.getState().stagedProcessedChangeIds).toEqual([]);
    });

    it('exitEditMode clears stagedProcessedChangeIds', async () => {
      const {store} = createTestStore();
      mockStartSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'TUNING', summary: 'ok'},
        message: 'ok',
        success: true,
      });

      store.getState().recordStageProcessed(['a', 'b']);
      await store.getState().exitEditMode();

      expect(store.getState().stagedProcessedChangeIds).toEqual([]);
    });

    it('recordStageProcessed deduplicates ids within a single call', () => {
      const {store} = createTestStore();

      store.getState().recordStageProcessed(['a', 'a', 'b']);

      expect(store.getState().stagedProcessedChangeIds).toEqual(['a', 'b']);
    });
  });

  describe('setSubgraphProvenance', () => {
    it('writes the given provenance for the given subgraph id, leaving other entries untouched', () => {
      const {store} = createTestStore();

      store.setState({
        subgraphProvenanceById: {sg1: 'pre-loaded'},
      });

      store.getState().setSubgraphProvenance('sg2', 'newly-created');

      expect(store.getState().subgraphProvenanceById).toEqual({
        sg1: 'pre-loaded',
        sg2: 'newly-created',
      });
    });

    it('overwrites an existing provenance entry for the same subgraph id', () => {
      const {store} = createTestStore();

      store.setState({
        subgraphProvenanceById: {sg1: 'pre-loaded'},
      });

      store.getState().setSubgraphProvenance('sg1', 'palette-placed');

      expect(store.getState().subgraphProvenanceById).toEqual({
        sg1: 'palette-placed',
      });
    });
  });

  describe('pruneSessionLocalMapsForSubgraph', () => {
    it('removes the subgraph id from subgraphProvenanceById, kvSelectionsById, and pairLinksById', () => {
      const {store} = createTestStore();

      store.setState({
        kvSelectionsById: {
          sg1: [
            {isEc: false, keyValuePairs: [], selected: true, systemId: 's1'},
          ],
          sg2: [
            {isEc: false, keyValuePairs: [], selected: true, systemId: 's2'},
          ],
        },
        pairLinksById: {
          'sg1:sg2': {
            controlLinks: [],
            dataLinks: [],
            destinationSubgraphSystemId: 'sg2',
            sourceSubgraphSystemId: 'sg1',
          },
          'sg3:sg4': {
            controlLinks: [],
            dataLinks: [],
            destinationSubgraphSystemId: 'sg4',
            sourceSubgraphSystemId: 'sg3',
          },
        },
        subgraphProvenanceById: {sg1: 'newly-created', sg2: 'pre-loaded'},
      });

      store.getState().pruneSessionLocalMapsForSubgraph('sg1');

      const state = store.getState();
      expect(state.subgraphProvenanceById).toEqual({sg2: 'pre-loaded'});
      expect(state.kvSelectionsById).toEqual({
        sg2: [{isEc: false, keyValuePairs: [], selected: true, systemId: 's2'}],
      });
      expect(state.pairLinksById).toEqual({
        'sg3:sg4': {
          controlLinks: [],
          dataLinks: [],
          destinationSubgraphSystemId: 'sg4',
          sourceSubgraphSystemId: 'sg3',
        },
      });
    });

    it('removes a pair link when the pruned subgraph id is on either side of the pair', () => {
      const {store} = createTestStore();

      store.setState({
        pairLinksById: {
          'sg2:sg1': {
            controlLinks: [],
            dataLinks: [],
            destinationSubgraphSystemId: 'sg1',
            sourceSubgraphSystemId: 'sg2',
          },
        },
      });

      store.getState().pruneSessionLocalMapsForSubgraph('sg1');

      expect(store.getState().pairLinksById).toEqual({});
    });

    it('is a no-op when the subgraph id has no entries in any of the three maps', () => {
      const {store} = createTestStore();

      store.setState({
        kvSelectionsById: {
          sg2: [
            {isEc: false, keyValuePairs: [], selected: true, systemId: 's2'},
          ],
        },
        pairLinksById: {
          'sg3:sg4': {
            controlLinks: [],
            dataLinks: [],
            destinationSubgraphSystemId: 'sg4',
            sourceSubgraphSystemId: 'sg3',
          },
        },
        subgraphProvenanceById: {sg2: 'pre-loaded'},
      });

      const before = store.getState();

      store.getState().pruneSessionLocalMapsForSubgraph('sg-unrelated');

      const after = store.getState();
      expect(after.subgraphProvenanceById).toEqual(
        before.subgraphProvenanceById,
      );
      expect(after.kvSelectionsById).toEqual(before.kvSelectionsById);
      expect(after.pairLinksById).toEqual(before.pairLinksById);
    });
  });

  describe('enterEditMode provenance seeding', () => {
    beforeEach(() => {
      mockEndSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'READONLY', summary: 'ok'},
      });
      mockStartSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'DESIGNER', summary: 'ok'},
        message: 'ok',
        success: true,
      });
    });
    it('seeds every subgraph present in graphData.subgraphs as pre-loaded', async () => {
      const {store} = createTestStoreWithGraphData(
        makeGraphData(['sg1', 'sg2']),
      );

      await store.getState().enterEditMode();

      expect(store.getState().subgraphProvenanceById).toEqual({
        sg1: 'pre-loaded',
        sg2: 'pre-loaded',
      });
    });

    it('seeds an empty subgraphProvenanceById when graphData is null', async () => {
      const {store} = createTestStoreWithGraphData(null);

      await store.getState().enterEditMode();

      expect(store.getState().subgraphProvenanceById).toEqual({});
    });

    it('caches graph-key definitions and seeds editable SGKV vectors', async () => {
      mockGetAllKeyDefinitions.mockResolvedValueOnce({
        data: [
          {
            isGraphKey: true,
            name: 'DeviceTX',
            naturalId: 1,
            systemId: 'key-device-tx',
            values: [
              {
                name: 'A2B_Mic',
                naturalId: 10,
                systemId: 'value-a2b-mic',
              },
            ],
          },
          {
            isGraphKey: false,
            name: 'CalibrationOnly',
            naturalId: 2,
            systemId: 'key-calibration',
            values: [],
          },
        ] as never,
        message: undefined,
        success: true,
      });
      const graphData = makeGraphData(['sg1']);
      graphData.subgraphs.sg1.kvVectors = [
        {
          isEc: true,
          keyValuePairs: [makeKeyValue(1, 'value-1')],
          selected: true,
          systemId: 'sgkv-1',
        },
      ];
      const {store} = createTestStoreWithGraphData(graphData);

      expect(await store.getState().enterEditMode()).toBe(true);

      expect(store.getState().availableGraphKeys).toEqual([
        {
          isGraphKey: true,
          name: 'DeviceTX',
          naturalId: 1,
          systemId: 'key-device-tx',
          values: [{name: 'A2B_Mic', naturalId: 10, systemId: 'value-a2b-mic'}],
        },
      ]);
      expect(store.getState().kvSelectionsById).toEqual({
        sg1: [
          {
            isEc: true,
            isSessionAdded: false,
            keyValuePairs: [makeKeyValue(1, 'value-1')],
            selected: true,
            systemId: 'sgkv-1',
          },
        ],
      });
    });

    it('seeds an empty editable vector list for a legacy subgraph snapshot', async () => {
      const graphData = makeGraphData(['sg1']);
      Reflect.deleteProperty(graphData.subgraphs.sg1, 'kvVectors');
      const {store} = createTestStoreWithGraphData(graphData);

      expect(await store.getState().enterEditMode()).toBe(true);
      expect(store.getState().kvSelectionsById).toEqual({sg1: []});
    });
  });

  describe('enterEditMode', () => {
    it('returns false and calls no API when the lock is already held', async () => {
      const {projectStore, store} = createTestStore();
      projectStore.getState().setActiveExclusiveMode('diff-merge');

      expect(await store.getState().enterEditMode()).toBe(false);
      expect(mockEndSession).not.toHaveBeenCalled();
      expect(projectStore.getState().editModeState).toBe('view');
    });

    it('ends the session, starts designer mode, and updates the real project store', async () => {
      const {projectStore, store} = createTestStore();
      mockEndSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'READONLY', summary: 'ok'},
      });
      mockStartSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'DESIGNER', summary: 'ok'},
        message: 'ok',
        success: true,
      });

      expect(await store.getState().enterEditMode()).toBe(true);
      expect(store.getState().mode).toBe('edit');
      expect(projectStore.getState().editModeState).toBe('edit');
      expect(projectStore.getState().activeExclusiveMode).toBe('usecase-edit');
      expect(mockStartSession).toHaveBeenCalledWith('proj-1', 'DESIGNER');
    });

    it('proceeds when endSession fails but getProjectById confirms READONLY', async () => {
      const {projectStore, store} = createTestStore();
      mockEndSession.mockResolvedValue({
        issues: [{code: 'END_FAILED', message: 'failed', severity: 'ERROR'}],
      });
      mockGetProjectById.mockResolvedValue({
        data: {
          description: '',
          name: 'p',
          projectId: 'proj-1',
          projectType: 'OFFLINE',
          sessionMode: 'READONLY',
        },
        message: 'ok',
        success: true,
      });
      mockStartSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'DESIGNER', summary: 'ok'},
        message: 'ok',
        success: true,
      });

      expect(await store.getState().enterEditMode()).toBe(true);
      expect(projectStore.getState().editModeState).toBe('edit');
    });

    it('releases the lock and returns false when endSession fails and getProjectById reports a non-READONLY mode', async () => {
      const {projectStore, store} = createTestStore();
      mockEndSession.mockResolvedValue({
        issues: [{code: 'END_FAILED', message: 'failed', severity: 'ERROR'}],
      });
      mockGetProjectById.mockResolvedValue({
        data: {
          description: '',
          name: 'p',
          projectId: 'proj-1',
          projectType: 'OFFLINE',
          sessionMode: 'TUNING',
        },
        message: 'ok',
        success: true,
      });

      expect(await store.getState().enterEditMode()).toBe(false);
      expect(projectStore.getState().activeExclusiveMode).toBe('none');
      expect(projectStore.getState().editModeState).toBe('view');
      expect(mockStartSession).not.toHaveBeenCalled();
    });

    it('releases the lock and returns false when startSession fails', async () => {
      const {projectStore, store} = createTestStore();
      mockEndSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'READONLY', summary: 'ok'},
      });
      mockStartSession.mockResolvedValue({message: 'failed', success: false});

      expect(await store.getState().enterEditMode()).toBe(false);
      expect(projectStore.getState().activeExclusiveMode).toBe('none');
      expect(projectStore.getState().editModeState).toBe('view');
    });
  });

  describe('exitEditMode', () => {
    it('starts a tuning session and updates the real project store', async () => {
      const {projectStore, store} = createTestStore();
      projectStore.getState().setActiveExclusiveMode('usecase-edit');
      mockStartSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'TUNING', summary: 'ok'},
        message: 'ok',
        success: true,
      });

      expect(await store.getState().exitEditMode()).toBe(true);
      expect(mockStartSession).toHaveBeenCalledWith('proj-1', 'TUNING');
      expect(projectStore.getState().activeExclusiveMode).toBe('none');
      expect(projectStore.getState().editModeState).toBe('view');
      expect(store.getState().mode).toBe('view');
    });

    it('returns false and leaves the lock held when startSession fails', async () => {
      const {projectStore, store} = createTestStore();
      projectStore.getState().setActiveExclusiveMode('usecase-edit');
      mockStartSession.mockResolvedValue({message: 'failed', success: false});

      expect(await store.getState().exitEditMode()).toBe(false);
      expect(projectStore.getState().activeExclusiveMode).toBe('usecase-edit');
    });

    it('clears session-local maps only on successful exit', async () => {
      const {store} = createTestStore();
      mockStartSession.mockResolvedValue({
        data: {projectId: 'proj-1', sessionMode: 'TUNING', summary: 'ok'},
        message: 'ok',
        success: true,
      });
      store.setState({
        kvSelectionsById: {
          sg1: [
            {isEc: false, keyValuePairs: [], selected: true, systemId: 's1'},
          ],
        },
      });

      await store.getState().exitEditMode();

      expect(store.getState().kvSelectionsById).toEqual({});
    });
  });
});
