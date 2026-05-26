/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useProjectStoreShallow} from '~shared/store/project-store-context';

export function useLogView() {
  return useProjectStoreShallow((state) => ({
    addLog: state.addLog,
    clearLogRowSelection: state.clearLogRowSelection,
    clearLogs: state.clearLogs,
    logs: state.logs,
    logsStatus: state.logsStatus,
    searchLogQuery: state.searchLogQuery,
    selectedLogTypes: state.selectedLogTypes,
    selectedRowLogId: state.selectedRowLogId,
    selectRowLog: state.selectRowLog,
    setSearchLogQuery: state.setSearchLogQuery,
    setSelectedLogTypes: state.setSelectedLogTypes,
    toggleLogExpansion: state.toggleLogExpansion,
  }));
}
