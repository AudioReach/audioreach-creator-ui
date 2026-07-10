/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ParameterDetailDto} from '~entities/spf-module-data';
import type {TreeViewItem} from '~features/generic-tree-view';
import {
  dirtyItemsToParamUpdateRequest,
  paramContainerToTreeViewData,
} from '~widgets/module-data-tab/lib/param-tree-view-adapter';

function makeParam(
  overrides?: Partial<ParameterDetailDto>,
): ParameterDetailDto {
  return {
    changeInfo: {changeType: 'NONE'},
    elements: [],
    name: 'Param',
    parameterId: 'param-1',
    systemId: 'sys-param-1',
    ...overrides,
  };
}

describe('paramContainerToTreeViewData', () => {
  it('maps parameterId to id and preserves all metadata fields', () => {
    const container = {
      changeInfo: {changeType: 'NONE' as const},
      parameters: [
        makeParam({
          deprecated: true,
          description: 'desc',
          isHidden: true,
          name: 'Gain',
          parameterId: 'param-42',
        }),
      ],
      systemId: 'sys-1',
    };

    const result = paramContainerToTreeViewData(container);

    expect(result.systemId).toBe('sys-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      deprecated: true,
      description: 'desc',
      id: 'param-42',
      isHidden: true,
      name: 'Gain',
    });
  });

  it('maps an empty parameter list to an empty items array', () => {
    const result = paramContainerToTreeViewData({
      changeInfo: {changeType: 'NONE'},
      parameters: [],
      systemId: 'sys-1',
    });

    expect(result.items).toEqual([]);
  });
});

describe('dirtyItemsToParamUpdateRequest', () => {
  it('overlays dirty items onto the original params and marks them UPDATE', () => {
    const originalParams = [
      makeParam({name: 'Gain', parameterId: 'param-1', systemId: 'sys-1'}),
    ];
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-1', name: 'Gain'},
    ];

    const result = dirtyItemsToParamUpdateRequest(dirtyItems, originalParams);

    expect(result.data[0]).toEqual({
      changeInfo: {changeType: 'UPDATE'},
      elements: [],
      name: 'Gain',
      parameterId: 'param-1',
      systemId: 'sys-1',
    });
  });

  it('falls back to the dirty item id as systemId when no original parameter matches', () => {
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-unknown', name: 'New Param'},
    ];

    const result = dirtyItemsToParamUpdateRequest(dirtyItems, []);

    expect(result.data[0]).toEqual({
      changeInfo: {changeType: 'UPDATE'},
      elements: [],
      name: 'New Param',
      parameterId: 'param-unknown',
      systemId: 'param-unknown',
    });
  });
});
