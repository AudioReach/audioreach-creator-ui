/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  TOP_ID,
  TOP_NODE_ID,
  toMoveDestination,
  withTopNode,
} from '~features/subsystem-browser/lib/subsystem-top-node';

describe('withTopNode', () => {
  it('wraps the root subsystems in the Top node', () => {
    const roots = [
      {children: [], id: 1, name: 'Root', subgraphIds: [], systemId: 'ss-1'},
    ];

    expect(withTopNode(roots)).toEqual([
      {
        children: roots,
        id: TOP_NODE_ID,
        name: 'TOP',
        subgraphIds: [],
        systemId: TOP_ID,
      },
    ]);
  });

  it('returns only the Top node when there are no subsystems', () => {
    expect(withTopNode([])[0].children).toEqual([]);
  });
});

describe('toMoveDestination', () => {
  it('maps the virtual Top node to a null destination', () => {
    expect(toMoveDestination(TOP_ID)).toBeNull();
    expect(toMoveDestination('subsystem-1')).toBe('subsystem-1');
  });
});
