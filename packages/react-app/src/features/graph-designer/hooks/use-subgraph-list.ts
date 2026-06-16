/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useGraphDesignerStoreShallow} from '../model/graph-designer-store-context';

export function useSubgraphList() {
  return useGraphDesignerStoreShallow((state) => ({
    loadSubgraphList: state.loadSubgraphList,
    selectedSubgraphTypes: state.selectedSubgraphTypes,
    setSelectedSubgraphTypes: state.setSelectedSubgraphTypes,
    setSubgraphListSearchQuery: state.setSubgraphListSearchQuery,
    subgraphList: state.subgraphList,
    subgraphListSearchQuery: state.subgraphListSearchQuery,
    subgraphListStatus: state.subgraphListStatus,
  }));
}
