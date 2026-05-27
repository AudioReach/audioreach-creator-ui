/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SubgraphDto} from '~entities/subgraph-definitions/model/subgraph-definition.dto';

export interface DraggedSubgraphInfo {
  subgraphId: number;
  subgraphType: string;
}

/**
 * Subgraph list store interface
 */
export interface SubgraphListStore {
  isDragEnabled: boolean;

  // Map to store filter state per project
  projectFilters: Record<string, {subgraphTypeFilter: string[]}>;

  query: string;

  selectedSubgraphTypes: string[];

  setDragEnabled: (enabled: boolean) => void;

  setSearchString: (query: string) => void;
  setSelectedSubgraphTypes: (types: string[]) => void;

  setSubgraphList: (subgraphList: SubgraphDto[]) => void;
  // Stores the subgraph definitions from backend
  subgraphList: SubgraphDto[];
}
