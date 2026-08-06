/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/edit-session', () => ({
  endSession: jest.fn(),
  startSession: jest.fn(),
}));
jest.mock('~entities/project/api/projects-api', () => ({
  getProjectById: jest.fn(),
}));

import {createStore, type StoreApi} from 'zustand';

import {endSession, startSession} from '~entities/edit-session';
import {getProjectById} from '~entities/project/api/projects-api';
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
const mockStartSession = jest.mocked(startSession);
const mockGetProjectById = jest.mocked(getProjectById);

function createTestStore(projectId = 'proj-1'): {
  projectStore: StoreApi<ProjectStore>;
  store: StoreApi<EditSessionSlice>;
} {
  const projectStore = createProjectStore(projectId);
  projectStoreRegistry.register(projectId, projectStore);
  const store = createStore<EditSessionSlice>((set, get) =>
    createEditSessionSlice(set, get, projectId),
  );
  return {projectStore, store};
}

type TestStoreWithGraphData = EditSessionSlice & {
  graphData: UsecaseGraphData | null;
};

function createTestStoreWithGraphData(
  graphData: UsecaseGraphData | null,
  projectId = 'proj-1',
) {
  const projectStore = createProjectStore(projectId);
  projectStoreRegistry.register(projectId, projectStore);
  const store = createStore<TestStoreWithGraphData>((set, get) => ({
    ...createEditSessionSlice(set, get, projectId),
    graphData,
  }));
  return {projectStore, store};
}

function makeGraphData(subgraphIds: string[]): UsecaseGraphData {
  const subgraphs: UsecaseGraphData['subgraphs'] = {};
  for (const subgraphId of subgraphIds) {
    subgraphs[subgraphId] = {
      containers: [],
      subgraphId,
      subgraphName: subgraphId,
      subgraphType: '',
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

describe('EditSessionSlice', () => {
  beforeEach(() => {
    projectStoreRegistry.clear();
    mockEndSession.mockReset();
    mockStartSession.mockReset();
    mockGetProjectById.mockReset();
  });

  it('clears session-local maps when exiting edit mode', async () => {
    const {store} = createTestStore();
    mockStartSession.mockResolvedValue({
      data: {projectId: 'proj-1', sessionMode: 'TUNING', summary: 'ok'},
      message: 'ok',
      success: true,
    });

    store.setState({
      excludedLinks: [
        {
          connectionId: 'c1',
          connectionType: 'data',
          fromModuleId: 'm1',
          fromPortId: 'p1',
          toModuleId: 'm2',
          toPortId: 'p2',
        },
      ],
      kvSelectionsById: {
        sg1: [{keyValuePairs: [], selected: true, systemId: 's1'}],
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
    expect(state.mode).toBe('view');
    expect(state.kvSelectionsById).toEqual({});
    expect(state.excludedLinks).toEqual([]);
    expect(state.pairLinksById).toEqual({});
    expect(state.subgraphProvenanceById).toEqual({});
  });

  it('does not carry session-local state from a prior session into a new one', async () => {
    const {store} = createTestStore();
    mockEndSession.mockResolvedValue({message: 'ok', success: true});
    mockStartSession.mockResolvedValue({
      data: {projectId: 'proj-1', sessionMode: 'DESIGNER', summary: 'ok'},
      message: 'ok',
      success: true,
    });

    await store.getState().enterEditMode();
    store.setState({
      kvSelectionsById: {
        sg1: [{keyValuePairs: [], selected: true, systemId: 's1'}],
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
          sg1: [{keyValuePairs: [], selected: true, systemId: 's1'}],
          sg2: [{keyValuePairs: [], selected: true, systemId: 's2'}],
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
        sg2: [{keyValuePairs: [], selected: true, systemId: 's2'}],
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
          sg2: [{keyValuePairs: [], selected: true, systemId: 's2'}],
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
      mockEndSession.mockResolvedValue({message: 'ok', success: true});
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
      mockEndSession.mockResolvedValue({message: 'ok', success: true});
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
      mockEndSession.mockResolvedValue({message: 'failed', success: false});
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
      mockEndSession.mockResolvedValue({message: 'failed', success: false});
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
      mockEndSession.mockResolvedValue({message: 'ok', success: true});
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
          sg1: [{keyValuePairs: [], selected: true, systemId: 's1'}],
        },
      });

      await store.getState().exitEditMode();

      expect(store.getState().kvSelectionsById).toEqual({});
    });
  });
});
