/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useGraphDesignerStoreShallow} from '../model/graph-designer-store-context';

export function useGraphDesigner() {
  return useGraphDesignerStoreShallow((state) => ({
    addSelectedUsecase: state.addSelectedUsecase,
    clearGraphData: state.clearGraphData,
    clearSelectedUsecases: state.clearSelectedUsecases,
    graphData: state.graphData,
    graphDataStatus: state.graphDataStatus,
    isDirty: state.isDirty,
    loadGraphData: state.loadGraphData,
    markClean: state.markClean,
    markDirty: state.markDirty,
    removeSelectedUsecase: state.removeSelectedUsecase,
    selectedUsecases: state.selectedUsecases,
    setSelectedUsecases: state.setSelectedUsecases,
    usecaseSelectionStatus: state.usecaseSelectionStatus,
  }));
}
