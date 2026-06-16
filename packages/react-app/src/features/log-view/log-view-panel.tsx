/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type FC, useMemo} from 'react';

import {useLogView} from './hooks/use-log-view';
import {filterLogs} from './lib/filter-logs';
import LogViewTable from './ui/log-view/log-view-table';
import LogViewToolbar from './ui/log-view/log-view-toolbar';

/**
 * Combines LogViewToolbar and LogViewTable with proper styling for FlexLayout
 * integration
 */
const LogViewPanel: FC = () => {
  const {logs, searchLogQuery, selectedLogTypes} = useLogView();
  const filteredLogs = useMemo(
    () => filterLogs(logs, selectedLogTypes, searchLogQuery),
    [logs, selectedLogTypes, searchLogQuery],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <LogViewToolbar filteredLogs={filteredLogs} />
      <div className="overflow-y-auto">
        <LogViewTable filteredLogs={filteredLogs} />
      </div>
    </div>
  );
};

export default LogViewPanel;
