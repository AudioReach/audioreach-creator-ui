/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import type {Node, NodeProps} from '@xyflow/react';
import {Box, LogIn, LogOut, type LucideIcon, ScrollText} from 'lucide-react';

import type {ModuleNode as ModuleNodeData, ModuleShape} from '~entities/graph';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import {NODE_DIMENSIONS} from '../../lib/node-dimensions';
import {useNodeHighlight} from '../../model/use-node-highlight';
import {useVisualizerStore} from '../../model/visualizer-store-context';
import type {CoreOverride} from '../../model/visualizer.types';

import {PortHandles} from './port-handles';

type ModuleNodeProps = NodeProps<
  Node<ModuleNodeData & Record<string, unknown>>
>;

const CORNER_CLASSES: Record<CoreOverride['position'], string> = {
  'bottom-left': 'absolute bottom-0 left-0',
  'bottom-right': 'absolute bottom-0 right-0',
  'top-left': 'absolute left-0 top-0',
  'top-right': 'absolute right-0 top-0',
};

// Non-rect shapes are drawn as an SVG <polygon>/<circle> with an explicit
// stroke. A CSS border + clip-path would clip the border on the slanted/curved
// edges, leaving the outline partial — drawing the stroke in SVG keeps the full
// colored boundary. rect keeps its cheaper CSS border.
type PolygonShape = 'trapezoid-sink' | 'trapezoid-source' | 'triangle';

const SHAPE_POINTS: Record<PolygonShape, (w: number, h: number) => string> = {
  // Mirror of source: flat right edge, a short triangular point on the left
  // (signal flows in at the left tip).
  'trapezoid-sink': (w, h) =>
    `${w * 0.25},0 ${w},0 ${w},${h} ${w * 0.25},${h} 0,${h / 2}`,
  // Home-plate pentagon: mostly rectangular with a short point on the right
  // (signal out).
  'trapezoid-source': (w, h) =>
    `0,0 ${w * 0.75},0 ${w},${h / 2} ${w * 0.75},${h} 0,${h}`,
  triangle: (w, h) => `0,0 ${w},${h / 2} 0,${h}`,
};

// Default Lucide icon per shape, used when the node carries no explicit icon.
const SHAPE_ICONS: Record<ModuleShape, LucideIcon> = {
  circle: ScrollText, // data logging
  rect: Box, // generic module
  'trapezoid-sink': LogIn,
  'trapezoid-source': LogOut,
  triangle: Box,
};

function ShapeOutline({
  background,
  border,
  height,
  shape,
  width,
}: {
  background: string;
  border: string;
  height: number;
  shape: Exclude<ModuleShape, 'rect'>;
  width: number;
}): ReactNode {
  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      data-testid="module-shape-svg"
      height={height}
      width={width}
    >
      {shape === 'circle' ? (
        <circle
          cx={width / 2}
          cy={height / 2}
          fill={background}
          r={Math.min(width, height) / 2 - 1}
          stroke={border}
          strokeWidth={1.5}
        />
      ) : (
        <polygon
          fill={background}
          points={SHAPE_POINTS[shape](width, height)}
          stroke={border}
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}

function defaultFooter(
  node: ModuleNodeData,
  showModuleInstanceId: boolean,
): ReactNode {
  return (
    <div
      className="text-primary text-xxs flex flex-col items-center leading-tight"
      data-testid="module-default-footer"
    >
      <span className="max-w-full whitespace-normal break-words text-center">
        {node.alias ?? node.label}
      </span>
      {showModuleInstanceId ? (
        <span className="text-secondary" data-testid="module-instance-id">
          {`IID: ${ConvertNumberToHexString(node.moduleId) ?? node.moduleId}`}
        </span>
      ) : null}
    </div>
  );
}

export function ModuleNode({data: node, selected}: ModuleNodeProps) {
  const renderNodeContent = useVisualizerStore(
    (state) => state.renderNodeContent,
  );
  const nodeDisplayConfig = useVisualizerStore(
    (state) => state.nodeDisplayConfig,
  );
  const highlight = useNodeHighlight(node.id);

  const override = renderNodeContent ? renderNodeContent(node) : null;
  const showModuleInstanceId = nodeDisplayConfig?.showModuleInstanceId ?? true;

  const shape = node.shape ?? 'rect';
  const isLocked = node.locked === true;
  const isPpModule = node.isPpModule === true;
  const ShapeIcon = SHAPE_ICONS[shape];

  const footer = override?.footer ?? defaultFooter(node, showModuleInstanceId);
  // The shape box occupies the node minus the external footer strip, so ports
  // anchor to the visible box and the caption hangs in the gap below it.
  const boxHeight = Math.max(
    0,
    node.height - NODE_DIMENSIONS.module.footerHeight,
  );

  const background =
    highlight.state === 'active'
      ? highlight.activeBackgroundColor
      : isPpModule
        ? 'var(--color-background-support-success)'
        : 'var(--node-shade-medium)';
  // Selection shows the same info-coloured border as a search match; search
  // state still wins when present, then the PP highlight.
  const borderColor =
    highlight.state !== 'none'
      ? highlight.borderColor
      : selected
        ? 'var(--color-border-support-info)'
        : isPpModule
          ? 'var(--color-border-support-success)'
          : highlight.borderColor;
  const backgroundClass =
    highlight.state === 'active'
      ? 'bg-support-warning'
      : isPpModule
        ? 'bg-support-success'
        : 'bg-[var(--node-shade-medium)]';
  const borderClass =
    highlight.state !== 'none'
      ? 'border-support-warning'
      : selected
        ? 'border-support-info'
        : isPpModule
          ? 'border-support-success'
          : 'border-neutral-10';

  return (
    <div
      className="relative"
      data-locked={isLocked || undefined}
      data-node-id={node.id}
      data-pp-module={isPpModule || undefined}
      data-shape={shape}
      data-testid="module-node"
      style={{height: node.height, width: node.width}}
    >
      <div
        className={[
          'module-node relative w-full',
          shape === 'rect' ? 'rounded border' : '',
          shape === 'rect' ? backgroundClass : '',
          shape === 'rect' ? borderClass : '',
          highlight.highlightMatchClass,
          highlight.highlightActiveClass,
          highlight.containsMatchClass,
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="module-shape-layer"
        style={{height: boxHeight}}
      >
        {shape !== 'rect' ? (
          <ShapeOutline
            background={background}
            border={borderColor}
            height={boxHeight}
            shape={shape}
            width={node.width}
          />
        ) : null}

        {node.icon ? (
          <img
            alt=""
            className="module-icon absolute left-1/2 top-1/2 block h-6 w-6 -translate-x-1/2 -translate-y-1/2"
            data-testid="module-icon"
            src={node.icon}
          />
        ) : (
          <ShapeIcon
            aria-hidden
            className="module-icon text-secondary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            data-testid="module-shape-icon"
            size={20}
          />
        )}

        {override?.coreOverrides?.map((slot, idx) => (
          <div
            key={`${slot.position}-${idx}`}
            className={`core-override core-override-${slot.position} ${CORNER_CLASSES[slot.position]}`}
            data-position={slot.position}
            data-testid={`core-override-${slot.position}`}
          >
            {slot.content}
          </div>
        ))}
      </div>

      <PortHandles anchorHeight={boxHeight} node={node} />

      {/* Footer sits in the reserved strip below the box with a small gap so
          it doesn't hug the module core. */}
      <div
        className="module-footer absolute inset-x-0"
        data-testid="module-footer"
        style={{top: boxHeight + 8}}
      >
        {footer}
      </div>
    </div>
  );
}
