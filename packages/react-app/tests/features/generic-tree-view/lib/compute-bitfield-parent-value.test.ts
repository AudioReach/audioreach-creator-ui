/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto} from '~entities/spf-module-data';
import {computeBitfieldParentValue} from '~features/generic-tree-view/lib/compute-bitfield-parent-value';

jest.mock('~shared/lib/logger');

describe('computeBitfieldParentValue', () => {
  it('mask 0x06, newOption 2 → parent 0x04, NOT 0x0C (P0 regression)', () => {
    const bf: BitFieldDto = {
      allowedValues: [
        {name: 'Zero', type: 'NAME_VALUE_PAIR', value: '0x0'},
        {name: 'One', type: 'NAME_VALUE_PAIR', value: '0x1'},
        {name: 'Two', type: 'NAME_VALUE_PAIR', value: '0x2'},
      ],
      bitMask: '0x06',
      name: 'bf',
      type: 'BIT_FIELD',
    };

    // mask 0x06, new option value 0x2, current parent hex 0x00000000
    const result = computeBitfieldParentValue(
      [bf],
      '0x06',
      '0x2',
      '0x00000000',
    );
    // shift = 1 (lowest set bit of 0x06 is bit 1)
    // (0x2 << 1) & 0x06 = 0x4 & 0x6 = 0x4
    expect(result).toBe('0x00000004');
    // The WRONG result from multiplication would be 0x0C:
    // (2 * 6) = 12 = 0x0C — must NOT equal that
    expect(result).not.toBe('0x0000000C');
  });

  it('mask 0x01 (bit 0), option 1 → 0x01', () => {
    const bf: BitFieldDto = {
      allowedValues: [{name: 'On', type: 'NAME_VALUE_PAIR', value: '0x1'}],
      bitMask: '0x01',
      name: 'b',
      type: 'BIT_FIELD',
    };
    expect(computeBitfieldParentValue([bf], '0x01', '0x1', '0x00000000')).toBe(
      '0x00000001',
    );
  });

  it('mask 0xF0 (bits 4-7), option 3 → 0x30', () => {
    const bf: BitFieldDto = {
      allowedValues: [{name: 'Three', type: 'NAME_VALUE_PAIR', value: '0x3'}],
      bitMask: '0xF0',
      name: 'b',
      type: 'BIT_FIELD',
    };
    // shift=4, (3 << 4) & 0xF0 = 0x30 & 0xF0 = 0x30
    expect(computeBitfieldParentValue([bf], '0xF0', '0x3', '0x00000000')).toBe(
      '0x00000030',
    );
  });
});
