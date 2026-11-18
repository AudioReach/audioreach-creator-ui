/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from 'react';

import ValidationResultTable from './validation-result-table';
import ValidationResultToolbar from './validation-result-toolbar';

interface ValidationResultPanelProps {
  projectId: string;
}

/**
 * Combines ValidationResultToolbar and ValidationResultTable with proper styling
 * for FlexLayout integration
 */
const ValidationResultPanel: FC<ValidationResultPanelProps> = ({projectId}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div>
        <ValidationResultToolbar />
      </div>

      {/* Table - flexible height with internal scrolling */}
      <div
        style={{
          minHeight: '0',
        }}
      >
        <ValidationResultTable projectId={projectId} />
      </div>
    </div>
  );
};

export default ValidationResultPanel;
