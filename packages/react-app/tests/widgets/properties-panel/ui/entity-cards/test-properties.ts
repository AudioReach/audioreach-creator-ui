/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {PropertyDto} from '~shared/lib/property.dto';

export function makeProperty(
  name: string,
  value = '1',
  allowedValues: Array<{name: string; value: string}> = [],
): PropertyDto {
  return {
    elements: [
      {
        allowedValues: allowedValues.map((option) => ({
          ...option,
          type: 'NAME_VALUE_PAIR' as const,
        })),
        isReadOnly: false,
        name,
        policy: 'BASIC',
        type: 'CONFIG_ELEMENT',
        value,
      },
    ],
    propertyId: name,
    propertyName: name,
    systemId: `${name}-system-id`,
  };
}
