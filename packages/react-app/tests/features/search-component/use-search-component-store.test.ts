/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  DEFAULT_PROJECT_STATE,
  useSearchComponentStore,
} from '~features/search-component/model/use-search-component-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';

/** Reset the store to a clean state before every test */
beforeEach(() => {
  useSearchComponentStore.setState({projects: {}});
});

// ---------------------------------------------------------------------------
// getProjectState
// ---------------------------------------------------------------------------

describe('getProjectState', () => {
  it('returns DEFAULT_PROJECT_STATE for an unknown project', () => {
    const state = useSearchComponentStore
      .getState()
      .getProjectState('unknown-project');

    expect(state).toEqual(DEFAULT_PROJECT_STATE);
    expect(state.searchTerm).toBe('');
    expect(state.history).toEqual([]);
  });

  it('returns the stored state for a known project', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'AudioDecoder');

    const state = useSearchComponentStore.getState().getProjectState(PROJECT_A);

    expect(state.searchTerm).toBe('AudioDecoder');
  });

  it('isolates state between different projects', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'TermA');
    useSearchComponentStore.getState().setSearchTerm(PROJECT_B, 'TermB');

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_A).searchTerm,
    ).toBe('TermA');
    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_B).searchTerm,
    ).toBe('TermB');
  });
});

// ---------------------------------------------------------------------------
// setSearchTerm
// ---------------------------------------------------------------------------

describe('setSearchTerm', () => {
  it('sets the search term for a project', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'AudioDecoder');

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_A).searchTerm,
    ).toBe('AudioDecoder');
  });

  it('updates the search term when called again', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'first');
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'second');

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_A).searchTerm,
    ).toBe('second');
  });

  it('does not affect other projects', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'TermA');

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_B).searchTerm,
    ).toBe('');
  });

  it('preserves existing history when updating search term', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'OldTerm');
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'NewTerm');

    const state = useSearchComponentStore.getState().getProjectState(PROJECT_A);
    expect(state.searchTerm).toBe('NewTerm');
    expect(state.history).toContain('OldTerm');
  });
});

// ---------------------------------------------------------------------------
// addToHistory
// ---------------------------------------------------------------------------

describe('addToHistory', () => {
  it('adds a term to the history (most recent first)', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'first');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'second');

    const {history} = useSearchComponentStore
      .getState()
      .getProjectState(PROJECT_A);

    expect(history[0]).toBe('second');
    expect(history[1]).toBe('first');
  });

  it('deduplicates: adding an existing term moves it to the front', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'first');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'second');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'first'); // duplicate

    const {history} = useSearchComponentStore
      .getState()
      .getProjectState(PROJECT_A);

    expect(history[0]).toBe('first');
    expect(history).toHaveLength(2); // no duplicate entry
  });

  it('trims whitespace before adding to history', () => {
    useSearchComponentStore
      .getState()
      .addToHistory(PROJECT_A, '  AudioDecoder  ');

    const {history} = useSearchComponentStore
      .getState()
      .getProjectState(PROJECT_A);

    expect(history[0]).toBe('AudioDecoder');
  });

  it('does not add blank/whitespace-only terms', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, '   ');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, '');

    const {history} = useSearchComponentStore
      .getState()
      .getProjectState(PROJECT_A);

    expect(history).toHaveLength(0);
  });

  it('caps history at 5 entries (MAX_HISTORY_SIZE)', () => {
    for (let i = 1; i <= 7; i++) {
      useSearchComponentStore.getState().addToHistory(PROJECT_A, `term-${i}`);
    }

    const {history} = useSearchComponentStore
      .getState()
      .getProjectState(PROJECT_A);

    expect(history).toHaveLength(5);
    // Most recent entries are retained
    expect(history[0]).toBe('term-7');
    expect(history[4]).toBe('term-3');
  });

  it('does not affect other projects', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'TermA');

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_B).history,
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// clearHistory
// ---------------------------------------------------------------------------

describe('clearHistory', () => {
  it('clears all history entries for a project', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'term1');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'term2');
    useSearchComponentStore.getState().clearHistory(PROJECT_A);

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_A).history,
    ).toHaveLength(0);
  });

  it('preserves search term when clearing history', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'AudioDecoder');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'AudioDecoder');
    useSearchComponentStore.getState().clearHistory(PROJECT_A);

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_A).searchTerm,
    ).toBe('AudioDecoder');
  });

  it('does not affect other projects', () => {
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'TermA');
    useSearchComponentStore.getState().addToHistory(PROJECT_B, 'TermB');
    useSearchComponentStore.getState().clearHistory(PROJECT_A);

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_B).history,
    ).toContain('TermB');
  });
});

// ---------------------------------------------------------------------------
// removeProject
// ---------------------------------------------------------------------------

describe('removeProject', () => {
  it('removes all state for a project', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'AudioDecoder');
    useSearchComponentStore.getState().addToHistory(PROJECT_A, 'AudioDecoder');
    useSearchComponentStore.getState().removeProject(PROJECT_A);

    // After removal, getProjectState returns defaults
    const state = useSearchComponentStore.getState().getProjectState(PROJECT_A);

    expect(state).toEqual(DEFAULT_PROJECT_STATE);
  });

  it('does not affect other projects', () => {
    useSearchComponentStore.getState().setSearchTerm(PROJECT_A, 'TermA');
    useSearchComponentStore.getState().setSearchTerm(PROJECT_B, 'TermB');
    useSearchComponentStore.getState().removeProject(PROJECT_A);

    expect(
      useSearchComponentStore.getState().getProjectState(PROJECT_B).searchTerm,
    ).toBe('TermB');
  });

  it('is a no-op for a project that does not exist', () => {
    // Should not throw
    expect(() => {
      useSearchComponentStore.getState().removeProject('non-existent-project');
    }).not.toThrow();
  });
});
