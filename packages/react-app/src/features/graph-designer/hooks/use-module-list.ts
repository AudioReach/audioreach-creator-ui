/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useGraphDesignerStoreShallow} from '~shared/store/tab-stores/graph-designer-store-context';

export function useModuleList() {
  return useGraphDesignerStoreShallow((state) => ({
    loadModuleList: state.loadModuleList,
    moduleList: state.moduleList,
    moduleListSearchQuery: state.moduleListSearchQuery,
    moduleListStatus: state.moduleListStatus,
    setModuleListSearchQuery: state.setModuleListSearchQuery,
  }));
}
