/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// ContainerNode (segment per containerId:subgraphId)
import type {FC} from 'react';

import type {NodeProps} from '@xyflow/react';

import {
  type RFContainerNodeData,
  SEARCH_HIGHLIGHT_BG,
  SEARCH_HIGHLIGHT_BORDER,
} from '~features/usecase-visualizer/model/usecase-visualizer.types';

export const ContainerNode: FC<NodeProps> = ({data, selected}) => {
  const containerData = data as RFContainerNodeData;
  const hl = containerData.searchHighlight ?? 'none';
  const isHighlighted = hl === 'active' || hl === 'match';

  return (
    <div
      className="rounded-md border-2 border-dotted shadow-sm"
      style={{
        backgroundColor: isHighlighted
          ? SEARCH_HIGHLIGHT_BG[hl]
          : selected
            ? 'var(--color-background-support-info-subtle)'
            : 'var(--color-background-neutral-02)',
        borderColor: isHighlighted
          ? SEARCH_HIGHLIGHT_BORDER[hl]
          : selected
            ? 'var(--color-border-support-info)'
            : 'var(--color-background-neutral-07)',
        borderWidth: isHighlighted || selected ? '3px' : '2px',
        height: '100%',
        position: 'relative',
        width: '100%',
      }}
    >
      <div className="text-disabled text-xxs absolute left-2 top-2 rounded font-semibold">
        {containerData.label}
      </div>
    </div>
  );
};
