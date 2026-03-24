/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useProjectLayoutStore} from '~shared/store';

import {useLoadModuleList} from '../../hooks/use-load-module-list';

import {ModuleTree} from './module-tree';

export const ModuleListPanel = () => {
  // Get the active project ID from the project layout store
  const activeProjectGroup = useProjectLayoutStore((state) =>
    state.getActiveProjectGroup(),
  );

  // Use projectKey as the project ID (this is the unique identifier for the project)
  const projectId = activeProjectGroup?.projectKey;

  // Load module list data from API
  useLoadModuleList(projectId);

  return (
    // Scrollable tree below that grows to fill available space
    <div
      className="flex w-full flex-col gap-1"
      style={{height: '100%', overflow: 'hidden'}}
    >
      <ModuleTree />
    </div>
  );
};
