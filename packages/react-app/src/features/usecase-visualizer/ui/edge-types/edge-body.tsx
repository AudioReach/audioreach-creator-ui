/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import {BaseEdge, EdgeLabelRenderer} from '@xyflow/react';

import {STROKE_DASHARRAY_DASHED} from '../../lib/edge-stroke';
import {useVisualizerStore} from '../../model/visualizer-store-context';

const LABEL_VERTICAL_OFFSET = 10;

export interface EdgeBodyProps {
  arrowMarkerId?: string;
  dashed?: boolean;
  edgeId: string;
  label?: ReactNode;
  labelX: number;
  labelY: number;
  path: string;
  selected?: boolean;
  strokeWidth: number;
}

/**
 * Shared edge body for data and control links: renders the SVG path with the
 * design-token stroke and an EdgeLabelRenderer-portalled label that hides
 * below the per-mount lodThreshold.
 */
export function EdgeBody({
  arrowMarkerId,
  dashed,
  edgeId,
  label,
  labelX,
  labelY,
  path,
  selected,
  strokeWidth,
}: EdgeBodyProps) {
  // Requires VisualizerStoreProvider in the tree — EdgeBody is only used
  // inside UsecaseVisualizer where the provider is always present.
  const labelHidden = useVisualizerStore(
    (state) => state.lodZoom < state.lodThreshold,
  );

  const stroke = selected
    ? 'var(--color-border-support-info)'
    : 'var(--color-border-neutral-10)';

  const showLabel = label != null && label !== '' && !labelHidden;

  return (
    <>
      <BaseEdge
        markerEnd={arrowMarkerId ? `url(#${arrowMarkerId})` : undefined}
        path={path}
        style={{
          stroke,
          strokeDasharray: dashed ? STROKE_DASHARRAY_DASHED : undefined,
          strokeWidth,
        }}
      />
      {showLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-neutral-02 text-primary text-xxs pointer-events-none absolute rounded-sm px-1"
            data-edge-id={edgeId}
            data-testid={`edge-label-${edgeId}`}
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - LABEL_VERTICAL_OFFSET}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
