/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Position} from '@xyflow/react';

import type {ModuleShape, Port} from '../model/visualizer.types';

import {controlHandleId, dataHandleId, offsetForIndex} from './port-geometry';

export interface PortAnchor {
  handleId: string;
  handleKind: 'source' | 'target';
  port: Port;
  position: Position;
  x?: number;
  y?: number;
}

interface GroupedPorts {
  controls: Port[];
  inputs: Port[];
  outputs: Port[];
}

function rectAnchors(
  grouped: GroupedPorts,
  width: number,
  height: number,
): PortAnchor[] {
  const {controls, inputs, outputs} = grouped;

  const anchors: PortAnchor[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const port = inputs[i];
    anchors.push({
      handleId: dataHandleId(port.id),
      handleKind: 'target',
      port,
      position: Position.Left,
      y: offsetForIndex(height, inputs.length, i),
    });
  }

  for (let i = 0; i < outputs.length; i++) {
    const port = outputs[i];
    anchors.push({
      handleId: dataHandleId(port.id),
      handleKind: 'source',
      port,
      position: Position.Right,
      y: offsetForIndex(height, outputs.length, i),
    });
  }

  for (let i = 0; i < controls.length; i++) {
    const port = controls[i];
    const x = offsetForIndex(width, controls.length, i);
    anchors.push({
      handleId: controlHandleId(port.id, 'source'),
      handleKind: 'source',
      port,
      position: Position.Top,
      x,
    });
    anchors.push({
      handleId: controlHandleId(port.id, 'target'),
      handleKind: 'target',
      port,
      position: Position.Top,
      x,
    });
  }

  return anchors;
}

function circleAnchors(
  grouped: GroupedPorts,
  width: number,
  height: number,
): PortAnchor[] {
  const {controls, inputs, outputs} = grouped;

  // The circle renders centered with radius min(w,h)/2 (see ShapeOutline), so
  // anchors ride that circle's perimeter.
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2;

  const anchors: PortAnchor[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const port = inputs[i];
    const deg = 150 + (60 / (inputs.length + 1)) * (i + 1);
    const rad = (deg * Math.PI) / 180;
    anchors.push({
      handleId: dataHandleId(port.id),
      handleKind: 'target',
      port,
      position: Position.Left,
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    });
  }

  for (let i = 0; i < outputs.length; i++) {
    const port = outputs[i];
    const deg = -30 + (60 / (outputs.length + 1)) * (i + 1);
    const rad = (deg * Math.PI) / 180;
    anchors.push({
      handleId: dataHandleId(port.id),
      handleKind: 'source',
      port,
      position: Position.Right,
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    });
  }

  for (let i = 0; i < controls.length; i++) {
    const port = controls[i];
    const deg = -120 + (60 / (controls.length + 1)) * (i + 1);
    const rad = (deg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    anchors.push({
      handleId: controlHandleId(port.id, 'source'),
      handleKind: 'source',
      port,
      position: Position.Top,
      x,
      y,
    });
    anchors.push({
      handleId: controlHandleId(port.id, 'target'),
      handleKind: 'target',
      port,
      position: Position.Top,
      x,
      y,
    });
  }

  return anchors;
}

function trapezoidSourceAnchors(
  grouped: GroupedPorts,
  width: number,
  height: number,
): PortAnchor[] {
  const {outputs} = grouped;

  // Source pentagon converges to a point on the right:
  // polygon(0 0, 72% 0, 100% 50%, 72% 100%, 0 100%). Inputs (left edge) and
  // controls (top) are vertical/straight, so they fall through to rect. A
  // single output sits at the right tip; multiple outputs fall back to rect.
  const rectFallback = rectAnchors(
    {controls: grouped.controls, inputs: grouped.inputs, outputs: []},
    width,
    height,
  );

  const anchors: PortAnchor[] = [...rectFallback];
  if (outputs.length === 1) {
    anchors.push({
      handleId: dataHandleId(outputs[0].id),
      handleKind: 'source',
      port: outputs[0],
      position: Position.Right,
      x: width,
      y: height / 2,
    });
  } else {
    for (let i = 0; i < outputs.length; i++) {
      const port = outputs[i];
      anchors.push({
        handleId: dataHandleId(port.id),
        handleKind: 'source',
        port,
        position: Position.Right,
        y: offsetForIndex(height, outputs.length, i),
      });
    }
  }

  return anchors;
}

function trapezoidSinkAnchors(
  grouped: GroupedPorts,
  width: number,
  height: number,
): PortAnchor[] {
  const {inputs} = grouped;

  // Mirror of source: flat right edge (outputs) and top (controls) fall through
  // to rect; a single input sits at the left point. Multiple inputs fall back
  // to rect distribution.
  const rectFallback = rectAnchors(
    {controls: grouped.controls, inputs: [], outputs: grouped.outputs},
    width,
    height,
  );

  const anchors: PortAnchor[] = [...rectFallback];
  if (inputs.length === 1) {
    anchors.push({
      handleId: dataHandleId(inputs[0].id),
      handleKind: 'target',
      port: inputs[0],
      position: Position.Left,
      x: 0,
      y: height / 2,
    });
  } else {
    for (let i = 0; i < inputs.length; i++) {
      const port = inputs[i];
      anchors.push({
        handleId: dataHandleId(port.id),
        handleKind: 'target',
        port,
        position: Position.Left,
        y: offsetForIndex(height, inputs.length, i),
      });
    }
  }

  return anchors;
}

function triangleAnchors(
  grouped: GroupedPorts,
  width: number,
  height: number,
): PortAnchor[] {
  const {controls, inputs, outputs} = grouped;

  const anchors: PortAnchor[] = [];

  if (outputs.length === 1) {
    const port = outputs[0];
    anchors.push({
      handleId: dataHandleId(port.id),
      handleKind: 'source',
      port,
      position: Position.Right,
      x: width,
      y: height / 2,
    });
  } else if (outputs.length > 1) {
    // Graceful degradation: multiple outputs fall back to rect distribution.
    for (let i = 0; i < outputs.length; i++) {
      const port = outputs[i];
      anchors.push({
        handleId: dataHandleId(port.id),
        handleKind: 'source',
        port,
        position: Position.Right,
        y: offsetForIndex(height, outputs.length, i),
      });
    }
  }

  if (inputs.length === 1) {
    const port = inputs[0];
    anchors.push({
      handleId: dataHandleId(port.id),
      handleKind: 'target',
      port,
      position: Position.Left,
      x: 0,
      y: height / 2,
    });
  } else if (inputs.length > 1) {
    // Graceful degradation: multiple inputs fall back to rect distribution.
    for (let i = 0; i < inputs.length; i++) {
      const port = inputs[i];
      anchors.push({
        handleId: dataHandleId(port.id),
        handleKind: 'target',
        port,
        position: Position.Left,
        y: offsetForIndex(height, inputs.length, i),
      });
    }
  }

  for (let i = 0; i < controls.length; i++) {
    const port = controls[i];
    anchors.push({
      handleId: controlHandleId(port.id, 'source'),
      handleKind: 'source',
      port,
      position: Position.Top,
      x: width / 2,
    });
    anchors.push({
      handleId: controlHandleId(port.id, 'target'),
      handleKind: 'target',
      port,
      position: Position.Top,
      x: width / 2,
    });
  }

  return anchors;
}

/**
 * Computes the full set of ReactFlow handle anchors for a module node.
 * One PortAnchor corresponds to one Handle element.
 * Control ports emit two anchors (source + target) regardless of shape.
 * Left/Right-positioned anchors use `y` for their vertical offset along the
 * node edge; Top/Bottom-positioned anchors use `x` for their horizontal offset.
 */
export function getPortAnchors(
  shape: ModuleShape | undefined,
  ports: Port[],
  width: number,
  height: number,
): PortAnchor[] {
  const resolved = shape ?? 'rect';
  const grouped: GroupedPorts = {
    controls: ports.filter((p) => p.portIoType === 'control'),
    inputs: ports.filter((p) => p.portIoType === 'input'),
    outputs: ports.filter((p) => p.portIoType === 'output'),
  };

  switch (resolved) {
    case 'circle':
      return circleAnchors(grouped, width, height);
    case 'trapezoid-sink':
      return trapezoidSinkAnchors(grouped, width, height);
    case 'trapezoid-source':
      return trapezoidSourceAnchors(grouped, width, height);
    case 'triangle':
      return triangleAnchors(grouped, width, height);
    case 'rect':
    default:
      return rectAnchors(grouped, width, height);
  }
}
