/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {PropertyDto} from '~shared/lib/property.dto';
import {
  dirtyItemsToPatchPropertiesRequest,
  propertyDtosToTreeViewData,
  propertyHasConfigName,
} from '~widgets/properties-panel/lib/property-tree-adapter';

const visibleProperty: PropertyDto = {
  elements: [
    {
      isReadOnly: false,
      name: 'Scenario ID',
      policy: 'BASIC',
      type: 'CONFIG_ELEMENT',
      value: '1',
    },
  ],
  propertyId: 32,
  propertyName: 'Scenario',
  systemId: 'prop-scenario',
};

const hiddenProperty: PropertyDto = {
  elements: [
    {
      isReadOnly: false,
      name: 'Hidden Field',
      policy: 'HIDDEN',
      type: 'CONFIG_ELEMENT',
      value: 'x',
    },
  ],
  propertyId: 64,
  propertyName: 'Hidden',
  systemId: 'prop-hidden',
};

describe('propertyDtosToTreeViewData', () => {
  it('maps property DTO fields to tree view items', () => {
    const result = propertyDtosToTreeViewData(
      'sg-1',
      [visibleProperty, hiddenProperty],
      'set',
    );

    expect(result).toEqual({
      items: [
        {
          elements: visibleProperty.elements,
          id: '32',
          isHidden: false,
          isReadOnly: false,
          name: 'Scenario',
          systemId: 'prop-scenario',
        },
        {
          elements: hiddenProperty.elements,
          id: '64',
          isHidden: true,
          isReadOnly: false,
          name: 'Hidden',
          systemId: 'prop-hidden',
        },
      ],
      source: 'set',
      systemId: 'sg-1',
    });
  });

  it('detects nested config element names', () => {
    expect(propertyHasConfigName(visibleProperty, 'Scenario ID')).toBe(true);
    expect(propertyHasConfigName(visibleProperty, 'Container Heap')).toBe(
      false,
    );
  });

  it('builds patch requests from dirty tree items and original metadata', () => {
    const request = dirtyItemsToPatchPropertiesRequest(
      [
        {
          elements: [
            {
              isReadOnly: false,
              name: 'Scenario ID',
              policy: 'BASIC',
              type: 'CONFIG_ELEMENT',
              value: '2',
            },
          ],
          id: '32',
          name: 'Scenario',
        },
      ],
      [visibleProperty],
    );

    expect(request.properties).toEqual([
      {
        ...visibleProperty,
        changeInfo: {changeType: 'UPDATE'},
        elements: [
          {
            isReadOnly: false,
            name: 'Scenario ID',
            policy: 'BASIC',
            type: 'CONFIG_ELEMENT',
            value: '2',
          },
        ],
        propertyName: 'Scenario',
      },
    ]);
  });
});
