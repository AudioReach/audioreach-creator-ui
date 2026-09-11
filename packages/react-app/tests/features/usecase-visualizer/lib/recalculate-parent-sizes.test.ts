/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node} from '@xyflow/react';

import {recalculateParentSizes} from '~features/usecase-visualizer/lib/recalculate-parent-sizes';

// Suppress logger noise.
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeNode(overrides: Partial<Node> & {id: string}): Node {
  return {
    data: {},
    height: 100,
    id: overrides.id,
    position: {x: 0, y: 0},
    type: 'module',
    width: 160,
    ...overrides,
  };
}

describe('recalculateParentSizes — no parents', () => {
  it('returns nodes unchanged when no parent-kind nodes exist', () => {
    const nodes = [makeNode({id: 'm1'}), makeNode({id: 'm2'})];
    const {nodes: out, resizedParents} = recalculateParentSizes(nodes);
    expect(out).toEqual(nodes);
    expect(resizedParents).toEqual({});
  });
});

describe('recalculateParentSizes — container parent', () => {
  it('resizes container to fit its children with padding', () => {
    const parent = makeNode({
      height: 50,
      id: 'cnt-1',
      position: {x: 0, y: 0},
      type: 'container',
      width: 50,
    });
    // padding = 16 (container)
    const child = makeNode({
      height: 80,
      id: 'm1',
      parentId: 'cnt-1',
      position: {x: 20, y: 20},
      width: 160,
    });

    const {nodes: out, resizedParents} = recalculateParentSizes([
      parent,
      child,
    ]);

    // maxRight = 20 + 160 = 180; newWidth = 180 + 16 = 196
    // maxBottom = 20 + 80 = 100; newHeight = 100 + 16 = 116
    expect(resizedParents['cnt-1']).toEqual({height: 116, width: 196});

    const updatedParent = out.find((n) => n.id === 'cnt-1');
    expect(updatedParent?.width).toBe(196);
    expect(updatedParent?.height).toBe(116);
  });

  it('does not emit resizedParents entry when dimensions are unchanged', () => {
    const child = makeNode({
      height: 80,
      id: 'm1',
      parentId: 'cnt-1',
      position: {x: 20, y: 20},
      width: 160,
    });
    // Pre-sized to exact fit: width=196, height=116
    const parent = makeNode({
      height: 116,
      id: 'cnt-1',
      position: {x: 0, y: 0},
      type: 'container',
      width: 196,
    });

    const {resizedParents} = recalculateParentSizes([parent, child]);
    expect(resizedParents).toEqual({});
  });
});

describe('recalculateParentSizes — overflow correction', () => {
  it('shifts child inward and parent left when child drifts past left edge', () => {
    const parent = makeNode({
      height: 200,
      id: 'cnt-overflow',
      position: {x: 100, y: 100},
      type: 'container',
      width: 300,
    });
    const child = makeNode({
      height: 80,
      id: 'c-overflow',
      parentId: 'cnt-overflow',
      position: {x: 2, y: 20},
      width: 160,
    });

    const {nodes: out} = recalculateParentSizes([parent, child]);
    const updatedParent = out.find((n) => n.id === 'cnt-overflow')!;
    const updatedChild = out.find((n) => n.id === 'c-overflow')!;

    expect(updatedParent.position.x).toBe(86);
    expect(updatedChild.position.x).toBe(16);
  });

  it('shifts child inward and parent up when child drifts past top edge', () => {
    const parent = makeNode({
      height: 200,
      id: 'sg-overflow',
      position: {x: 0, y: 50},
      type: 'subgraph',
      width: 300,
    });
    const child = makeNode({
      height: 60,
      id: 'csg-overflow',
      parentId: 'sg-overflow',
      position: {x: 20, y: 3},
      width: 100,
    });

    const {nodes: out} = recalculateParentSizes([parent, child]);
    const updatedParent = out.find((n) => n.id === 'sg-overflow')!;
    const updatedChild = out.find((n) => n.id === 'csg-overflow')!;

    const dy = 16 - 3;
    expect(updatedParent.position.y).toBe(50 - dy);
    expect(updatedChild.position.y).toBe(3 + dy);
  });

  it('does not shift when child is already at or beyond padding threshold', () => {
    const parent = makeNode({
      height: 200,
      id: 'cnt-no-shift',
      position: {x: 0, y: 0},
      type: 'container',
      width: 300,
    });
    const child = makeNode({
      height: 80,
      id: 'c-no-shift',
      parentId: 'cnt-no-shift',
      position: {x: 16, y: 16},
      width: 160,
    });

    const {nodes: out} = recalculateParentSizes([parent, child]);
    const updatedChild = out.find((n) => n.id === 'c-no-shift')!;
    expect(updatedChild.position).toEqual({x: 16, y: 16});
  });
});
describe('recalculateParentSizes — subgraph parent', () => {
  it('uses subgraph padding (16) when computing new size', () => {
    const parent = makeNode({
      height: 50,
      id: 'sg-1',
      position: {x: 0, y: 0},
      type: 'subgraph',
      width: 50,
    });
    const child = makeNode({
      height: 60,
      id: 'c1',
      parentId: 'sg-1',
      position: {x: 16, y: 16},
      width: 100,
    });

    const {resizedParents} = recalculateParentSizes([parent, child]);
    // child at padding boundary (16) → no overflow correction
    // Header minimum width (320) is larger than the child bounds (132).
    expect(resizedParents['sg-1']).toEqual({height: 92, width: 320});
  });
});

describe('recalculateParentSizes — multiple children', () => {
  it('uses the outermost bounding box across all children', () => {
    const parent = makeNode({
      height: 50,
      id: 'cnt-1',
      position: {x: 0, y: 0},
      type: 'container',
      width: 50,
    });
    const child1 = makeNode({
      height: 80,
      id: 'c1',
      parentId: 'cnt-1',
      position: {x: 16, y: 16},
      width: 100,
    });
    const child2 = makeNode({
      height: 60,
      id: 'c2',
      parentId: 'cnt-1',
      position: {x: 150, y: 20},
      width: 120,
    });

    const {resizedParents} = recalculateParentSizes([parent, child1, child2]);
    // child1 at x=16 (= padding), child2 at x=150 — no overflow
    // maxRight = max(16+100, 150+120) = max(116, 270) = 270
    // maxBottom = max(16+80, 20+60) = max(96, 80) = 96
    // newWidth = 270 + 16 = 286; newHeight = 96 + 16 = 112
    expect(resizedParents['cnt-1']).toEqual({height: 112, width: 286});
  });
});

describe('recalculateParentSizes — non-parent-kind nodes are ignored', () => {
  it('does not resize a module node even if it has children', () => {
    const parent = makeNode({
      height: 50,
      id: 'mod-1',
      position: {x: 0, y: 0},
      type: 'module',
      width: 50,
    });
    const child = makeNode({
      height: 30,
      id: 'c1',
      parentId: 'mod-1',
      position: {x: 5, y: 5},
      width: 40,
    });

    const {resizedParents} = recalculateParentSizes([parent, child]);
    expect(resizedParents).toEqual({});
  });
});

describe('recalculateParentSizes — nested parent chain', () => {
  it('applies bottom-up resizing in a single pass for container -> subgraph -> subsystem', () => {
    const subsystem = makeNode({
      height: 120,
      id: 'ss-1',
      position: {x: 0, y: 0},
      type: 'subsystem',
      width: 140,
    });
    const subgraph = makeNode({
      height: 90,
      id: 'sg-1',
      parentId: 'ss-1',
      position: {x: 100, y: 100},
      type: 'subgraph',
      width: 100,
    });
    const container = makeNode({
      height: 80,
      id: 'cnt-1',
      parentId: 'sg-1',
      position: {x: 20, y: 20},
      type: 'container',
      width: 80,
    });
    const module = makeNode({
      height: 40,
      id: 'm-1',
      parentId: 'cnt-1',
      position: {x: 16, y: 16},
      width: 50,
    });

    const {nodes: out, resizedParents} = recalculateParentSizes([
      subsystem,
      subgraph,
      container,
      module,
    ]);

    const updatedContainer = out.find((n) => n.id === 'cnt-1')!;
    const updatedSubgraph = out.find((n) => n.id === 'sg-1')!;
    const updatedSubsystem = out.find((n) => n.id === 'ss-1')!;

    // Container padding=16: module (16,16,50x40) -> width=82,height=72
    expect(updatedContainer.width).toBe(82);
    expect(updatedContainer.height).toBe(72);

    // Subgraph header minimum width is larger than the child bounds.
    expect(updatedSubgraph.width).toBe(320);
    expect(updatedSubgraph.height).toBe(108);

    // Subsystem padding/baseHeight=100 using updated subgraph dimensions.
    expect(updatedSubsystem.width).toBe(520);
    expect(updatedSubsystem.height).toBe(308);

    expect(resizedParents).toEqual({
      'cnt-1': {height: 72, width: 82},
      'sg-1': {height: 108, width: 320},
      'ss-1': {height: 308, width: 520},
    });
  });
});
