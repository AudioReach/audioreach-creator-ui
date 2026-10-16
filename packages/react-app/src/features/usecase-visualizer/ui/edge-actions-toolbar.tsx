/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {EdgeToolbar} from '@xyflow/react';

import type {AnyEdge} from '~entities/graph';

import {buildEdgeTarget} from '../lib/context-menu-target';
import {useVisualizerStore} from '../model/visualizer-store-context';
import {VISUALIZER_MODE} from '../model/visualizer.types';

import {ToolbarButtons} from './toolbar-buttons';

// React Flow defaults the toolbar to edge.zIndex + 1, which nested or selected
// nodes (zIndex up to 1000+) cover. Keep it above every node layer.
const EDGE_TOOLBAR_Z_INDEX = 10000;

export function EdgeActionsToolbar({
  edge,
  edgeId,
  selected,
  x,
  y,
}: {
  edge?: AnyEdge;
  edgeId: string;
  selected?: boolean;
  x: number;
  y: number;
}) {
  const mode = useVisualizerStore((state) => state.mode);
  const config = useVisualizerStore((state) => state.contextMenu);

  if (
    !selected ||
    mode !== VISUALIZER_MODE.EDIT ||
    !edge ||
    edge.locked ||
    !config
  ) {
    return null;
  }

  const target = buildEdgeTarget(edge);
  const items = config.getItems(target);
  if (items.length === 0) {
    return null;
  }

  return (
    <EdgeToolbar
      className="bg-raised border-neutral-02 pointer-events-auto inline-flex w-fit rounded border p-0 shadow-sm"
      edgeId={edgeId}
      isVisible={selected === true}
      style={{zIndex: EDGE_TOOLBAR_Z_INDEX}}
      x={x}
      y={y}
    >
      <ToolbarButtons
        items={items}
        onAction={config.onAction}
        target={target}
      />
    </EdgeToolbar>
  );
}
