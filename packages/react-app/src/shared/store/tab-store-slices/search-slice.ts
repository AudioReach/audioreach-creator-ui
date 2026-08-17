/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

/** Max history entries retained per tab. */
const MAX_HISTORY_SIZE = 5;

export interface SearchSlice {
  addToHistory: (term: string) => void;
  clearHistory: () => void;
  history: string[];
  isSearchVisible: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setSearchVisible: (visible: boolean) => void;
}

type SetState<T> = StoreApi<T>['setState'];

export function createSearchSlice(
  set: SetState<SearchSlice>,
): SearchSlice {
  const setSlice = set;
  return {
    addToHistory: (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) {
        return;
      }
      setSlice((state) => {
        const deduplicated = state.history.filter((h) => h !== trimmed);
        return {
          history: [trimmed, ...deduplicated].slice(0, MAX_HISTORY_SIZE),
        };
      });
      logger.debug('searchSlice: addToHistory', {
        action: 'add_to_history',
        component: 'searchSlice',
      });
    },

    clearHistory: () => {
      setSlice({history: []});
      logger.debug('searchSlice: clearHistory', {
        action: 'clear_history',
        component: 'searchSlice',
      });
    },

    history: [],

    isSearchVisible: false,

    searchTerm: '',

    setSearchTerm: (term: string) => {
      setSlice({searchTerm: term});
      logger.debug('searchSlice: setSearchTerm', {
        action: 'set_search_term',
        component: 'searchSlice',
      });
    },

    setSearchVisible: (visible: boolean) => {
      setSlice({isSearchVisible: visible});
      logger.debug('searchSlice: setSearchVisible', {
        action: 'set_search_visible',
        component: 'searchSlice',
      });
    },
  };
}
