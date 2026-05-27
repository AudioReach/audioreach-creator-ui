/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useGraphDesignerStoreShallow} from '../model/graph-designer-store-context';

export function useSubsystemBrowser() {
  return useGraphDesignerStoreShallow((state) => ({
    addSubsystem: state.addSubsystem,
    loadSubsystems: state.loadSubsystems,
    removeSubsystem: state.removeSubsystem,
    renameSubsystem: state.renameSubsystem,
    setSubsystemData: state.setSubsystemData,
    subsystemData: state.subsystemData,
    subsystemStatus: state.subsystemStatus,
  }));
}
