/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {NodeToolbar, Position} from '@xyflow/react';

import {NODE_KIND, type AnyNode} from '~entities/graph';

import {buildNodeTarget} from '../lib/context-menu-target';
import {useVisualizerStore} from '../model/visualizer-store-context';
import {VISUALIZER_MODE} from '../model/visualizer.types';

import {ToolbarButtons} from './toolbar-buttons';

// Node kinds that display this toolbar.
// Add a kind here to enable toolbar actions for that node type.
export const TOOLBAR_NODE_KINDS: ReadonlySet<AnyNode['nodeKind']> = new Set([
  NODE_KIND.CONTAINER,
  NODE_KIND.MODULE,
  NODE_KIND.SUBGRAPH,
  NODE_KIND.SUBGRAPH_PROXY,
  NODE_KIND.SUBSYSTEM,
]);

export function NodeActionsToolbar({
  node,
  selected,
}: {
  node: AnyNode;
  selected: boolean;
}) {
  const mode = useVisualizerStore((state) => state.mode);
  const config = useVisualizerStore((state) => state.contextMenu);

  if (!selected || mode !== VISUALIZER_MODE.EDIT || node.locked || !config) {
    return null;
  }

  const target = buildNodeTarget(node);
  const items = config.getItems(target);
  if (items.length === 0) {
    return null;
  }

  return (
    <NodeToolbar
      align="start"
      className="bg-raised border-neutral-02 pointer-events-auto inline-flex w-fit rounded border p-0 shadow-sm"
      offset={6}
      position={Position.Top}
    >
      <ToolbarButtons
        items={items}
        onAction={config.onAction}
        target={target}
      />
    </NodeToolbar>
  );
}
