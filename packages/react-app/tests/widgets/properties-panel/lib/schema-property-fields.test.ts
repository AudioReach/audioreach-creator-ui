/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TreeViewData} from '~features/generic-tree-view';
import type {PropertyElement} from '~shared/lib/property.dto';
import {
  buildConfigElementValueDirtyItem,
  findConfigElement,
} from '~widgets/properties-panel/lib/schema-property-fields';

function makeData(elements: PropertyElement[]): TreeViewData {
  return {
    items: [
      {
        elements,
        id: 'prop-1',
        name: 'Property',
      },
    ],
    systemId: 'sys-1',
  };
}

describe('schema-property-fields', () => {
  it('finds config elements when array value data is missing', () => {
    const data = makeData([
      {
        isReadOnly: false,
        name: 'Array',
        template: [
          {
            isReadOnly: false,
            name: 'Container Type',
            type: 'ConfigElement',
            value: 'olc',
          },
        ],
        type: 'ElementTemplateArray',
      } as PropertyElement,
    ]);

    expect(findConfigElement(data, 'Container Type')?.value).toBe('olc');
  });

  it('updates nested config elements when array value data is missing', () => {
    const data = makeData([
      {
        isReadOnly: false,
        name: 'Array',
        template: [
          {
            isReadOnly: false,
            name: 'Container Type',
            type: 'ConfigElement',
            value: 'olc',
          },
        ],
        type: 'ElementTemplateArray',
      } as PropertyElement,
    ]);

    const dirtyItem = buildConfigElementValueDirtyItem(
      data,
      'Container Type',
      'plc',
    );

    expect(dirtyItem?.elements).toEqual([
      {
        isReadOnly: false,
        name: 'Array',
        template: [
          {
            isReadOnly: false,
            name: 'Container Type',
            type: 'ConfigElement',
            value: 'plc',
          },
        ],
        type: 'ElementTemplateArray',
        value: [],
      },
    ]);
  });
});
