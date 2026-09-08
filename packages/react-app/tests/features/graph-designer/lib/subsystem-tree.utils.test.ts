/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {buildSubsystemTree} from '~features/graph-designer/lib/subsystem-tree.utils';

import {
  makeSpfModuleDto,
  makeSubsystemDto,
} from '../test-utils/component-dto-fixtures';

describe('buildSubsystemTree', () => {
  it('deduplicates repeated subsystem DTOs at root and child levels', () => {
    const root = makeSubsystemDto({
      id: 1,
      name: 'Root',
      systemId: 'ss-root',
    });
    const child = makeSubsystemDto({
      id: 2,
      name: 'Child',
      parentSystemId: 'ss-root',
      systemId: 'ss-child',
    });
    const rootAlias = makeSubsystemDto({
      id: 101,
      name: 'Root Alias',
      systemId: 'ss-root',
    });
    const childAlias = makeSubsystemDto({
      id: 102,
      name: 'Child Alias',
      parentSystemId: 'ss-root',
      systemId: 'ss-child',
    });

    const tree = buildSubsystemTree(
      [root, child, rootAlias, childAlias],
      [
        makeSpfModuleDto({
          parentSystemId: 'ss-root',
          subgraphId: 'sg-root',
        }),
        makeSpfModuleDto({
          parentSystemId: 'ss-root',
          subgraphId: 'sg-root-alias',
        }),
        makeSpfModuleDto({
          parentSystemId: 'ss-child',
          subgraphId: 'sg-child',
        }),
        makeSpfModuleDto({
          parentSystemId: 'ss-child',
          subgraphId: 'sg-child-alias',
        }),
      ],
    );

    expect(tree).toEqual([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            children: [],
            id: 2,
            name: 'Child',
            subgraphIds: ['sg-child', 'sg-child-alias'],
            systemId: 'ss-child',
          }),
        ],
        id: 1,
        name: 'Root',
        subgraphIds: ['sg-root', 'sg-root-alias'],
        systemId: 'ss-root',
      }),
    ]);
  });
});
