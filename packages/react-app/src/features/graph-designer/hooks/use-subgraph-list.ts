/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {useGraphDesignerStoreShallow} from '../model/graph-designer-store-context';

export function useSubgraphList() {
  const {subgraphs, ...rest} = useGraphDesignerStoreShallow((state) => ({
    loadSubgraphList: state.loadSubgraphList,
    selectedSubgraphTypes: state.selectedSubgraphTypes,
    setSelectedSubgraphTypes: state.setSelectedSubgraphTypes,
    setSubgraphListSearchQuery: state.setSubgraphListSearchQuery,
    subgraphList: state.subgraphList,
    subgraphListSearchQuery: state.subgraphListSearchQuery,
    subgraphListStatus: state.subgraphListStatus,
    subgraphs: state.graphData?.subgraphs,
  }));

  // Scoped to this hook call/store instance via useMemo, unlike a
  // module-level cache which would be shared (and clobbered) across every
  // open project's GraphDesignerStore.
  const presentSubgraphIds = useMemo(
    () => Object.keys(subgraphs ?? {}),
    [subgraphs],
  );

  return {...rest, presentSubgraphIds};
}
