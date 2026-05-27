/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useGraphDesignerStoreShallow} from '../model/graph-designer-store-context';

export function useKeyConfigurator() {
  return useGraphDesignerStoreShallow((state) => ({
    calibrationKeys: state.calibrationKeys,
    initializeConfiguration: state.initializeConfiguration,
    isEditable: state.isEditable,
    keyConfigStatus: state.keyConfigStatus,
    moduleTagKeys: state.moduleTagKeys,
    resetConfiguration: state.resetConfiguration,
    saveConfiguration: state.saveConfiguration,
    setIsEditable: state.setIsEditable,
    subgraphConfig: state.subgraphConfig,
    subsystemConfig: state.subsystemConfig,
  }));
}
