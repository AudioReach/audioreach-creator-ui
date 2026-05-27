/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import type {SubgraphDto} from '~entities/subgraph-definitions/model/subgraph-definition.dto';

import type {SubgraphListStore} from './subgraph-list-types';

export const useSubgraphListStore = create<SubgraphListStore>((set) => ({
  isDragEnabled: false,
  projectFilters: {},
  query: '',
  selectedSubgraphTypes: [],
  setDragEnabled: (enabled: boolean) => {
    set({isDragEnabled: enabled});
  },

  setSearchString: (query: string) => {
    set({query});
  },

  setSelectedSubgraphTypes: (types: string[]) => {
    set({selectedSubgraphTypes: types});
  },

  setSubgraphList: (subgraphList: SubgraphDto[]) => {
    set({subgraphList});
  },

  subgraphList: [],
}));
