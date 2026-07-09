/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto, NameValuePairDto} from '~entities/spf-module-data';
import {isBooleanSwitch} from '~features/generic-tree-view/lib/is-boolean-switch';

jest.mock('~shared/lib/logger');

describe('isBooleanSwitch', () => {
  it('recognises enable/disable pair as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'Enable', type: 'NAME_VALUE_PAIR', value: '0x1'},
      {name: 'Disable', type: 'NAME_VALUE_PAIR', value: '0x0'},
    ];
    expect(isBooleanSwitch(avs)).toBe(true);
  });

  it('recognises on/off pair as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'on', type: 'NAME_VALUE_PAIR', value: '0x1'},
      {name: 'off', type: 'NAME_VALUE_PAIR', value: '0x0'},
    ];
    expect(isBooleanSwitch(avs)).toBe(true);
  });

  it('does not treat a 3-option NAME_VALUE_PAIR list as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'a', type: 'NAME_VALUE_PAIR', value: '0x0'},
      {name: 'b', type: 'NAME_VALUE_PAIR', value: '0x1'},
      {name: 'c', type: 'NAME_VALUE_PAIR', value: '0x2'},
    ];
    expect(isBooleanSwitch(avs)).toBe(false);
  });

  it('does not treat arbitrary 2-option pairs (non-boolean names) as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'log_code', type: 'NAME_VALUE_PAIR', value: '0x0'},
      {name: 'no_log', type: 'NAME_VALUE_PAIR', value: '0x1'},
    ];
    expect(isBooleanSwitch(avs)).toBe(false);
  });

  it('does not treat BIT_FIELD options as a switch', () => {
    const avs: BitFieldDto[] = [
      {
        allowedValues: [],
        bitMask: '0x01',
        name: 'bit0',
        type: 'BIT_FIELD',
      },
      {
        allowedValues: [],
        bitMask: '0x02',
        name: 'bit1',
        type: 'BIT_FIELD',
      },
    ];
    expect(isBooleanSwitch(avs)).toBe(false);
  });
});
