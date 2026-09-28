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
      name: 'Root',
      naturalId: 1,
      systemId: 'ss-root',
    });
    const child = makeSubsystemDto({
      name: 'Child',
      naturalId: 2,
      parentSystemId: 'ss-root',
      systemId: 'ss-child',
    });
    const rootAlias = makeSubsystemDto({
      name: 'Root Alias',
      naturalId: 101,
      systemId: 'ss-root',
    });
    const childAlias = makeSubsystemDto({
      name: 'Child Alias',
      naturalId: 102,
      parentSystemId: 'ss-root',
      systemId: 'ss-child',
    });

    const tree = buildSubsystemTree(
      [root, child, rootAlias, childAlias],
      [
        makeSpfModuleDto({
          parentSystemId: 'ss-root',
          subgraphSystemId: 'sg-root',
        }),
        makeSpfModuleDto({
          parentSystemId: 'ss-root',
          subgraphSystemId: 'sg-root-alias',
        }),
        makeSpfModuleDto({
          parentSystemId: 'ss-child',
          subgraphSystemId: 'sg-child',
        }),
        makeSpfModuleDto({
          parentSystemId: 'ss-child',
          subgraphSystemId: 'sg-child-alias',
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
