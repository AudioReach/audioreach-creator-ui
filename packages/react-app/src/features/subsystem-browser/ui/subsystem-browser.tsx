/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type FC, useMemo} from 'react';

import {useSubsystemBrowser} from '~features/graph-designer';

import {TOP_ID, TOP_NODE_ID, withTopNode} from '../lib/subsystem-top-node';
import SubSystemTreeView from './subsystem-tree-view';

const DEFAULT_EXPANDED_IDS = [TOP_NODE_ID];

export const SubsystemBrowser: FC = () => {
  const {activeSubsystemId, navigateToSubsystem, subsystemData} =
    useSubsystemBrowser();

  const handleOnClick = (systemId: string) => {
    if (systemId === TOP_ID) {
      navigateToSubsystem(null);
      return;
    }
    navigateToSubsystem(systemId);
  };

  const treeData = useMemo(
    () => (subsystemData.length === 0 ? [] : withTopNode(subsystemData)),
    [subsystemData],
  );

  return (
    <div
      className="border-neutral-02 flex h-full w-full flex-col overflow-hidden rounded-md border"
      data-testid="subsystem-browser-placeholder"
    >
      <div className="border-neutral-02 bg-neutral-02 flex items-center justify-between border-b px-3 py-2 text-xs font-semibold tracking-wide uppercase">
        Subsystems
      </div>
      <div className="text-neutral-secondary flex-1 p-3 text-sm">
        <h2>Subsystem Browser</h2>
        <SubSystemTreeView
          data={treeData}
          defaultExpandedIds={DEFAULT_EXPANDED_IDS}
          onClick={handleOnClick}
          selectedSystemId={activeSubsystemId ?? TOP_ID}
        />
      </div>
    </div>
  );
};
