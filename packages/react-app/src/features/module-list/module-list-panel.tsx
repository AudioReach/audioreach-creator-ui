/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from 'react';

import {ModuleListPanel as ModuleListPanelComponent} from './ui/ModuleList/ModuleListPanel';

/**
 * Wrapper for ModuleListPanel with proper styling for FlexLayout integration
 */
const ModuleListPanel: FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <ModuleListPanelComponent />
    </div>
  );
};

export default ModuleListPanel;
