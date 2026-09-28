/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useUsecaseSelectionControlStore} from '~features/usecase-selection/model/usecase-selection-control-store';

// ── Test data ─────────────────────────────────────────────────────────────────

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';

const makeItem = (systemId: string, name = systemId): any => ({
  expanded: false,
  keyValuePairs: [],
  name,
  systemId,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const getState = (projectId: string) =>
  useUsecaseSelectionControlStore.getState().stateByProject[projectId];

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useUsecaseSelectionControlStore.setState({stateByProject: {}});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUsecaseSelectionControlStore — setSearchTerm', () => {
  it('sets the search term for a project', () => {
    useUsecaseSelectionControlStore.getState().setSearchTerm(PROJECT_A, 'BT');
    expect(getState(PROJECT_A).searchTerm).toBe('BT');
  });

  it('does not affect other projects', () => {
    useUsecaseSelectionControlStore.getState().setSearchTerm(PROJECT_A, 'BT');
    expect(getState(PROJECT_B)).toBeUndefined();
  });

  it('overwrites the previous search term', () => {
    const {setSearchTerm} = useUsecaseSelectionControlStore.getState();
    setSearchTerm(PROJECT_A, 'BT');
    setSearchTerm(PROJECT_A, 'SCO');
    expect(getState(PROJECT_A).searchTerm).toBe('SCO');
  });
});

describe('useUsecaseSelectionControlStore — setSearchScopeOption', () => {
  it('sets the scope option for a project', () => {
    useUsecaseSelectionControlStore
      .getState()
      .setSearchScopeOption(PROJECT_A, 'Subgraphs');
    expect(getState(PROJECT_A).searchScopeOption).toBe('Subgraphs');
  });

  it('defaults to "All" when no scope has been set', () => {
    useUsecaseSelectionControlStore.getState().setSearchTerm(PROJECT_A, 'x');
    expect(getState(PROJECT_A).searchScopeOption).toBe('All');
  });
});

describe('useUsecaseSelectionControlStore — setExpandedCategories', () => {
  it('sets the expanded categories list', () => {
    useUsecaseSelectionControlStore
      .getState()
      .setExpandedCategories(PROJECT_A, ['Cat A', 'Cat B']);
    expect(getState(PROJECT_A).expandedCategories).toEqual(['Cat A', 'Cat B']);
  });

  it('replaces the previous list entirely', () => {
    const {setExpandedCategories} = useUsecaseSelectionControlStore.getState();
    setExpandedCategories(PROJECT_A, ['Cat A', 'Cat B']);
    setExpandedCategories(PROJECT_A, ['Cat C']);
    expect(getState(PROJECT_A).expandedCategories).toEqual(['Cat C']);
  });

  it('can set an empty list (Collapse All)', () => {
    const {setExpandedCategories} = useUsecaseSelectionControlStore.getState();
    setExpandedCategories(PROJECT_A, ['Cat A']);
    setExpandedCategories(PROJECT_A, []);
    expect(getState(PROJECT_A).expandedCategories).toEqual([]);
  });
});

describe('useUsecaseSelectionControlStore — addToSearchHistory', () => {
  it('adds a new term to the history', () => {
    useUsecaseSelectionControlStore
      .getState()
      .addToSearchHistory(PROJECT_A, 'BT');
    expect(getState(PROJECT_A).searchHistory).toEqual(['BT']);
  });

  it('prepends new terms (most-recent first)', () => {
    const {addToSearchHistory} = useUsecaseSelectionControlStore.getState();
    addToSearchHistory(PROJECT_A, 'BT');
    addToSearchHistory(PROJECT_A, 'SCO');
    expect(getState(PROJECT_A).searchHistory).toEqual(['SCO', 'BT']);
  });

  it('deduplicates — does not add a term already in history', () => {
    const {addToSearchHistory} = useUsecaseSelectionControlStore.getState();
    addToSearchHistory(PROJECT_A, 'BT');
    addToSearchHistory(PROJECT_A, 'BT');
    expect(getState(PROJECT_A).searchHistory).toEqual(['BT']);
  });

  it('ignores empty or whitespace-only terms', () => {
    const {addToSearchHistory} = useUsecaseSelectionControlStore.getState();
    addToSearchHistory(PROJECT_A, '');
    addToSearchHistory(PROJECT_A, '   ');
    expect(getState(PROJECT_A)).toBeUndefined();
  });

  it('trims whitespace before storing', () => {
    useUsecaseSelectionControlStore
      .getState()
      .addToSearchHistory(PROJECT_A, '  BT  ');
    expect(getState(PROJECT_A).searchHistory).toEqual(['BT']);
  });

  it('limits history to 20 entries (most-recent first)', () => {
    const {addToSearchHistory} = useUsecaseSelectionControlStore.getState();
    for (let i = 0; i < 25; i++) {
      addToSearchHistory(PROJECT_A, `term_${i}`);
    }
    const history = getState(PROJECT_A).searchHistory;
    expect(history).toHaveLength(20);
    // Most recent should be first
    expect(history[0]).toBe('term_24');
    expect(history[19]).toBe('term_5');
  });
});

describe('useUsecaseSelectionControlStore — addToRecentlySelected', () => {
  it('adds items to recentlySelected', () => {
    const item = makeItem('UC_001', 'Speaker_Mic');
    useUsecaseSelectionControlStore
      .getState()
      .addToRecentlySelected(PROJECT_A, [item]);
    expect(getState(PROJECT_A).recentlySelected).toEqual([item]);
  });

  it('prepends new items (most-recent first)', () => {
    const {addToRecentlySelected} = useUsecaseSelectionControlStore.getState();
    const item1 = makeItem('UC_001', 'Speaker_Mic');
    const item2 = makeItem('UC_002', 'HFP_Rx');
    addToRecentlySelected(PROJECT_A, [item1]);
    addToRecentlySelected(PROJECT_A, [item2]);
    expect(getState(PROJECT_A).recentlySelected[0]).toEqual(item2);
    expect(getState(PROJECT_A).recentlySelected[1]).toEqual(item1);
  });

  it('deduplicates by systemId — does not add an item already in cache', () => {
    const {addToRecentlySelected} = useUsecaseSelectionControlStore.getState();
    const item = makeItem('UC_001', 'Speaker_Mic');
    addToRecentlySelected(PROJECT_A, [item]);
    addToRecentlySelected(PROJECT_A, [item]);
    expect(getState(PROJECT_A).recentlySelected).toHaveLength(1);
  });

  it('ignores items without systemId — recentlySelected stays empty', () => {
    const {addToRecentlySelected} = useUsecaseSelectionControlStore.getState();
    const itemNoId: any = {
      expanded: false,
      keyValuePairs: [],
      name: 'Group',
    };
    addToRecentlySelected(PROJECT_A, [itemNoId]);
    // Items without systemId are filtered out from newEntries.
    // patchProjectState is still called so state is created, but recentlySelected is empty.
    expect(getState(PROJECT_A)?.recentlySelected).toEqual([]);
  });

  it('does nothing when called with an empty array', () => {
    useUsecaseSelectionControlStore
      .getState()
      .addToRecentlySelected(PROJECT_A, []);
    expect(getState(PROJECT_A)).toBeUndefined();
  });

  it('limits cache to 10 items (most-recent first)', () => {
    const {addToRecentlySelected} = useUsecaseSelectionControlStore.getState();
    for (let i = 0; i < 12; i++) {
      addToRecentlySelected(PROJECT_A, [makeItem(`UC_${i}`, `Item_${i}`)]);
    }
    const recent = getState(PROJECT_A).recentlySelected;
    expect(recent).toHaveLength(10);
    // Most recent (UC_11) should be first
    expect(recent[0].systemId).toBe('UC_11');
    expect(recent[9].systemId).toBe('UC_2');
  });
});

describe('useUsecaseSelectionControlStore — project isolation', () => {
  it('keeps state isolated between projects', () => {
    const {setExpandedCategories, setSearchTerm} =
      useUsecaseSelectionControlStore.getState();

    setSearchTerm(PROJECT_A, 'BT');
    setExpandedCategories(PROJECT_B, ['Cat X']);

    expect(getState(PROJECT_A).searchTerm).toBe('BT');
    expect(getState(PROJECT_A).expandedCategories).toEqual([]);

    expect(getState(PROJECT_B).searchTerm).toBe('');
    expect(getState(PROJECT_B).expandedCategories).toEqual(['Cat X']);
  });

  it('returns default state values for an untouched project', () => {
    // Access via the store's getProjectState logic (read via a write that creates state)
    useUsecaseSelectionControlStore.getState().setSearchTerm(PROJECT_A, 'x');

    const state = getState(PROJECT_A);
    expect(state.expandedCategories).toEqual([]);
    expect(state.recentlySelected).toEqual([]);
    expect(state.searchHistory).toEqual([]);
    expect(state.searchScopeOption).toBe('All');
  });
});
