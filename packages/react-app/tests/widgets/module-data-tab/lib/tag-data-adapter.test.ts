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
    changeInfo: {changeType: 'NONE'},
    elements: [],
    name: 'Param',
    parameterId: 'param-1',
    systemId: 'sys-param-1',
    ...overrides,
  };
}

function makeTagDataDto(overrides?: Partial<TagDataDto>): TagDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    parameters: [],
    systemId: 'tkv-1',
    Tkv: [],
    ...overrides,
  };
}

describe('tagDataDtoToTreeViewData', () => {
  it('maps parameterId to id and preserves all metadata fields', () => {
    const dto = makeTagDataDto({
      parameters: [
        makeParam({
          deprecated: true,
          description: 'desc',
          elements: [
            {
              isReadOnly: false,
              name: 'el-1',
              type: 'CONFIG_ELEMENT',
              value: '1',
            },
          ],
          isHidden: true,
          isNeuralNet: true,
          isOffloaded: true,
          isReadOnly: true,
          name: 'Gain',
          parameterId: 'param-42',
          toolPolicy: ['RTC'],
        }),
      ],
    });

    const result = tagDataDtoToTreeViewData(dto);

    expect(result.systemId).toBe('tkv-1');
    expect(result.changeInfo).toEqual({changeType: 'NONE'});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      changeInfo: {changeType: 'NONE'},
      deprecated: true,
      description: 'desc',
      elements: dto.parameters[0].elements,
      id: 'param-42',
      isHidden: true,
      isNeuralNet: true,
      isOffloaded: true,
      isReadOnly: true,
      name: 'Gain',
      toolPolicy: ['RTC'],
    });
  });

  it('maps an empty parameter list to an empty items array', () => {
    const result = tagDataDtoToTreeViewData(makeTagDataDto());

    expect(result.items).toEqual([]);
  });
});

describe('dirtyItemsToTagDataRequest', () => {
  it('overlays dirty items onto the original DTO and marks them UPDATE', () => {
    const original = makeTagDataDto({
      parameters: [
        makeParam({name: 'Gain', parameterId: 'param-1', systemId: 'sys-1'}),
        makeParam({name: 'Mute', parameterId: 'param-2', systemId: 'sys-2'}),
      ],
    });
    const dirtyItems: TreeViewItem[] = [
      {
        elements: [
          {isReadOnly: false, name: 'el-1', type: 'CONFIG_ELEMENT', value: '5'},
        ],
        id: 'param-1',
        name: 'Gain',
      },
    ];

    const result = dirtyItemsToTagDataRequest(dirtyItems, original);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      changeInfo: {changeType: 'UPDATE'},
      elements: dirtyItems[0].elements,
      name: 'Gain',
      parameterId: 'param-1',
      systemId: 'sys-1',
    });
  });

  it('excludes non-dirty parameters from the request', () => {
    const original = makeTagDataDto({
      parameters: [
        makeParam({name: 'Gain', parameterId: 'param-1'}),
        makeParam({name: 'Mute', parameterId: 'param-2'}),
      ],
    });
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-1', name: 'Gain'},
    ];

    const result = dirtyItemsToTagDataRequest(dirtyItems, original);

    expect(result.data.map((p) => p.parameterId)).toEqual(['param-1']);
  });

  it('falls back to the dirty item id as systemId when no original parameter matches', () => {
    const original = makeTagDataDto({parameters: []});
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-unknown', name: 'New Param'},
    ];

    const result = dirtyItemsToTagDataRequest(dirtyItems, original);

    expect(result.data[0]).toEqual({
      changeInfo: {changeType: 'UPDATE'},
      elements: [],
      name: 'New Param',
      parameterId: 'param-unknown',
      systemId: 'param-unknown',
    });
  });
});
