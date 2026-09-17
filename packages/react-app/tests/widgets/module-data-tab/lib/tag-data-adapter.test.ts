/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ParameterDetailDto, TagDataDto} from '~entities/spf-module-data';
import type {TreeViewItem} from '~features/generic-tree-view';
import {
  dirtyItemsToTagDataRequest,
  tagDataDtoToTreeViewData,
} from '~widgets/module-data-tab/lib/tag-data-adapter';

function makeParam(
  overrides?: Partial<ParameterDetailDto>,
): ParameterDetailDto {
  return {
    elements: [],
    name: 'Param',
    naturalId: 'param-1',
    systemId: 'sys-param-1',
    ...overrides,
  };
}

function makeTagDataDto(overrides?: Partial<TagDataDto>): TagDataDto {
  return {
    parameters: [],
    systemId: 'tkv-1',
    Tkv: [],
    ...overrides,
  };
}

describe('tagDataDtoToTreeViewData', () => {
  it('maps naturalId to id and preserves all metadata fields', () => {
    const dto = makeTagDataDto({
      parameters: [
        makeParam({
          deprecated: true,
          description: 'desc',
          elements: [
            {
              isReadOnly: false,
              name: 'el-1',
              type: 'ConfigElement',
              value: '1',
            },
          ],
          isHidden: true,
          isNeuralNet: true,
          isOffloaded: true,
          isReadOnly: true,
          name: 'Gain',
          naturalId: 'param-42',
        }),
      ],
    });

    const result = tagDataDtoToTreeViewData(dto);

    expect(result.systemId).toBe('tkv-1');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      deprecated: true,
      description: 'desc',
      elements: dto.parameters[0].elements,
      id: 'param-42',
      isHidden: true,
      isNeuralNet: true,
      isOffloaded: true,
      isReadOnly: true,
      name: 'Gain',
    });
  });

  it('maps an empty parameter list to an empty items array', () => {
    const result = tagDataDtoToTreeViewData(makeTagDataDto());

    expect(result.items).toEqual([]);
  });
});

describe('dirtyItemsToTagDataRequest', () => {
  it('overlays dirty items onto the original DTO', () => {
    const original = makeTagDataDto({
      parameters: [
        makeParam({name: 'Gain', naturalId: 'param-1', systemId: 'sys-1'}),
        makeParam({name: 'Mute', naturalId: 'param-2', systemId: 'sys-2'}),
      ],
    });
    const dirtyItems: TreeViewItem[] = [
      {
        elements: [
          {isReadOnly: false, name: 'el-1', type: 'ConfigElement', value: '5'},
        ],
        id: 'param-1',
        name: 'Gain',
      },
    ];

    const result = dirtyItemsToTagDataRequest(dirtyItems, original);

    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0]).toEqual({
      elements: dirtyItems[0].elements,
      name: 'Gain',
      naturalId: 'param-1',
      systemId: 'sys-1',
    });
  });

  it('excludes non-dirty parameters from the request', () => {
    const original = makeTagDataDto({
      parameters: [
        makeParam({name: 'Gain', naturalId: 'param-1'}),
        makeParam({name: 'Mute', naturalId: 'param-2'}),
      ],
    });
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-1', name: 'Gain'},
    ];

    const result = dirtyItemsToTagDataRequest(dirtyItems, original);

    expect(result.parameters.map((p) => p.naturalId)).toEqual(['param-1']);
  });

  it('falls back to the dirty item id as systemId when no original parameter matches', () => {
    const original = makeTagDataDto({parameters: []});
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-unknown', name: 'New Param'},
    ];

    const result = dirtyItemsToTagDataRequest(dirtyItems, original);

    expect(result.parameters[0]).toEqual({
      elements: [],
      name: 'New Param',
      naturalId: 'param-unknown',
      systemId: 'param-unknown',
    });
  });
});
