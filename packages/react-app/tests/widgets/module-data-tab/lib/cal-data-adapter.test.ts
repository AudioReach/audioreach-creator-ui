/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CalDataDto, ParameterDetailDto} from '~entities/spf-module-data';
import type {TreeViewItem} from '~features/generic-tree-view';
import {
  buildGroupedTreeViewData,
  calDataDtoToTreeViewData,
  dirtyItemsToCalDataRequest,
} from '~widgets/module-data-tab/lib/cal-data-adapter';

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

function makeCalDataDto(overrides?: Partial<CalDataDto>): CalDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    Ckv: [],
    parameters: [],
    systemId: 'ckv-1',
    ...overrides,
  };
}

describe('calDataDtoToTreeViewData', () => {
  it('maps parameterId to id and preserves all metadata fields', () => {
    const dto = makeCalDataDto({
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

    const result = calDataDtoToTreeViewData(dto);

    expect(result.systemId).toBe('ckv-1');
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
    const result = calDataDtoToTreeViewData(makeCalDataDto());

    expect(result.items).toEqual([]);
  });
});

describe('dirtyItemsToCalDataRequest', () => {
  it('overlays dirty items onto the original DTO and marks them UPDATE', () => {
    const original = makeCalDataDto({
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

    const result = dirtyItemsToCalDataRequest(dirtyItems, original);

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
    const original = makeCalDataDto({
      parameters: [
        makeParam({name: 'Gain', parameterId: 'param-1'}),
        makeParam({name: 'Mute', parameterId: 'param-2'}),
      ],
    });
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-1', name: 'Gain'},
    ];

    const result = dirtyItemsToCalDataRequest(dirtyItems, original);

    expect(result.data.map((p) => p.parameterId)).toEqual(['param-1']);
  });

  it('falls back to the dirty item id as systemId when no original parameter matches', () => {
    const original = makeCalDataDto({parameters: []});
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'param-unknown', name: 'New Param'},
    ];

    const result = dirtyItemsToCalDataRequest(dirtyItems, original);

    expect(result.data[0]).toEqual({
      changeInfo: {changeType: 'UPDATE'},
      elements: [],
      name: 'New Param',
      parameterId: 'param-unknown',
      systemId: 'param-unknown',
    });
  });
});

describe('buildGroupedTreeViewData', () => {
  it('collects grouped elements into one TreeViewItem per group, ordered by first appearance', () => {
    const params: ParameterDetailDto[] = [
      makeParam({
        elements: [
          {
            group: 'General',
            isReadOnly: false,
            name: 'Volume',
            type: 'CONFIG_ELEMENT',
            value: '10',
          },
          {
            group: 'Advanced',
            isReadOnly: false,
            name: 'Threshold',
            type: 'CONFIG_ELEMENT',
            value: '2',
          },
        ],
        parameterId: 'param-1',
      }),
      makeParam({
        elements: [
          {
            group: 'General',
            isReadOnly: false,
            name: 'Mute',
            type: 'CONFIG_ELEMENT',
            value: 'false',
          },
        ],
        parameterId: 'param-2',
      }),
    ];

    const result = buildGroupedTreeViewData(params, 'ckv-1');

    expect(result.systemId).toBe('ckv-1');
    expect(result.items.map((item) => item.id)).toEqual([
      'General',
      'Advanced',
    ]);
    expect(result.items[0].elements).toHaveLength(2);
    expect(result.items[0].elements.map((el) => el.name)).toEqual([
      'Volume',
      'Mute',
    ]);
  });

  it('excludes elements without a group annotation', () => {
    const params: ParameterDetailDto[] = [
      makeParam({
        elements: [
          {
            isReadOnly: false,
            name: 'Ungrouped',
            type: 'CONFIG_ELEMENT',
            value: '1',
          },
        ],
        parameterId: 'param-1',
      }),
    ];

    const result = buildGroupedTreeViewData(params, 'ckv-1');

    expect(result.items).toEqual([]);
  });

  it('wraps subgroup elements in a STRUCT node nested inside the group item', () => {
    const params: ParameterDetailDto[] = [
      makeParam({
        elements: [
          {
            group: 'General',
            isReadOnly: false,
            name: 'Volume',
            type: 'CONFIG_ELEMENT',
            value: '10',
          },
          {
            group: 'General',
            isReadOnly: false,
            name: 'FilterFreq',
            subgroup: 'Filter',
            type: 'CONFIG_ELEMENT',
            value: '100',
          },
          {
            group: 'General',
            isReadOnly: false,
            name: 'FilterGain',
            subgroup: 'Filter',
            type: 'CONFIG_ELEMENT',
            value: '3',
          },
        ],
        parameterId: 'param-1',
      }),
    ];

    const result = buildGroupedTreeViewData(params, 'ckv-1');

    expect(result.items).toHaveLength(1);
    const generalItem = result.items[0];
    expect(generalItem.elements).toHaveLength(2);
    expect(generalItem.elements[0]).toMatchObject({
      name: 'Volume',
      type: 'CONFIG_ELEMENT',
    });

    const structEl = generalItem.elements[1];
    expect(structEl).toMatchObject({
      isReadOnly: false,
      name: 'Filter',
      structType: 'Filter',
      type: 'STRUCT',
    });
    if (structEl.type !== 'STRUCT') {
      throw new Error('expected STRUCT element');
    }
    expect(structEl.value.map((el) => el.name)).toEqual([
      'FilterFreq',
      'FilterGain',
    ]);
  });
});
