/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from 'react';

import LogViewTable from './ui/log-view/log-view-table';
import LogViewToolbar from './ui/log-view/log-view-toolbar';

/**
 * Combines LogViewToolbar and LogViewTable with proper styling for FlexLayout integration
 */
const LogViewPanel: FC = () => (
  <div className="flex h-full flex-col overflow-hidden">
    <LogViewToolbar />
    <div className="overflow-y-auto">
      <LogViewTable />
    </div>
  </div>
);

export default LogViewPanel;
