/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  calculateModuleHeight,
  NODE_DIMENSIONS,
} from '~features/usecase-visualizer/lib/node-dimensions';

describe('NODE_DIMENSIONS — exact constants', () => {
  it('module dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.module).toEqual({
      baseHeight: 80,
      footerHeight: 32,
      portRowHeight: 24,
      width: 160,
    });
  });

  it('subsystem dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.subsystem).toEqual({
      baseHeight: 100,
      portRowHeight: 24,
      width: 200,
    });
  });

  it('subgraphProxy dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.subgraphProxy).toEqual({height: 60, width: 160});
  });

  it('subgraph dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.subgraph).toEqual({headerHeight: 40, padding: 16});
  });

  it('container dimensions match the spec', () => {
    expect(NODE_DIMENSIONS.container).toEqual({headerHeight: 32, padding: 12});
  });
});

describe('calculateModuleHeight', () => {
  const {baseHeight, footerHeight, portRowHeight} = NODE_DIMENSIONS.module;

  it('1 input + 1 output + footer visible = baseHeight + footerHeight', () => {
    expect(calculateModuleHeight(1, 1, true)).toBe(baseHeight + footerHeight);
  });

  it('3 input + 1 output + footer visible adds 2 port rows', () => {
    expect(calculateModuleHeight(3, 1, true)).toBe(
      baseHeight + 2 * portRowHeight + footerHeight,
    );
  });

  it('1 input + 1 output without footer = baseHeight only', () => {
    expect(calculateModuleHeight(1, 1, false)).toBe(baseHeight);
  });

  it('1 input + 3 output without footer adds 2 port rows', () => {
    expect(calculateModuleHeight(1, 3, false)).toBe(
      baseHeight + 2 * portRowHeight,
    );
  });

  it('zero ports clamps to baseHeight (no negative rows)', () => {
    expect(calculateModuleHeight(0, 0, false)).toBe(baseHeight);
    expect(calculateModuleHeight(0, 0, true)).toBe(baseHeight + footerHeight);
  });
});
