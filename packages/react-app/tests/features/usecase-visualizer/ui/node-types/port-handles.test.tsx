/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Port} from '~entities/graph';
import {portFillClass} from '~features/usecase-visualizer/ui/node-types/port-handles';

function makePort(overrides: Partial<Port> = {}): Port {
  return {
    id: 'p1',
    portIoType: 'input',
    ...overrides,
  };
}

describe('portFillClass', () => {
  it('returns the "no connections" token when totalLinks is 0, regardless of activeLinks', () => {
    const port = makePort({activeLinks: 5, totalLinks: 0});
    expect(portFillClass(port)).toBe('!bg-white');
  });

  it('returns the "fully covered" token when activeLinks === totalLinks and totalLinks > 0', () => {
    const port = makePort({activeLinks: 3, totalLinks: 3});
    expect(portFillClass(port)).toBe('!bg-black');
  });

  it('returns the "partially covered" token when activeLinks < totalLinks', () => {
    const port = makePort({activeLinks: 1, totalLinks: 3});
    expect(portFillClass(port)).toBe(
      '!bg-[var(--color-background-support-neutral-medium)]',
    );
  });

  it('returns the "fully covered" token when activeLinks > totalLinks (defensive — invariant violated)', () => {
    const port = makePort({activeLinks: 5, totalLinks: 3});
    expect(portFillClass(port)).toBe('!bg-black');
  });

  it('treats undefined activeLinks/totalLinks the same as both 0 — no connections token', () => {
    const port = makePort();
    expect(portFillClass(port)).toBe('!bg-white');
  });
});
