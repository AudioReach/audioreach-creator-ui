/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto, NameValuePairDto} from '~entities/spf-module-data';
import {
  isBooleanSwitch,
  resolveBooleanPair,
} from '~features/generic-tree-view/lib/is-boolean-switch';

jest.mock('~shared/lib/logger');

describe('isBooleanSwitch', () => {
  it('recognises enable/disable pair as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'Enable', value: '0x1'},
      {name: 'Disable', value: '0x0'},
    ];
    expect(isBooleanSwitch(avs)).toBe(true);
  });

  it('recognises on/off pair as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'on', value: '0x1'},
      {name: 'off', value: '0x0'},
    ];
    expect(isBooleanSwitch(avs)).toBe(true);
  });

  it('does not treat a 3-option NameValue list as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'a', value: '0x0'},
      {name: 'b', value: '0x1'},
      {name: 'c', value: '0x2'},
    ];
    expect(isBooleanSwitch(avs)).toBe(false);
  });

  it('does not treat arbitrary 2-option pairs (non-boolean names) as a switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'log_code', value: '0x0'},
      {name: 'no_log', value: '0x1'},
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

describe('resolveBooleanPair', () => {
  it('resolves on/off by name when enable is first', () => {
    const pair = [
      {name: 'enable', value: '0x1'},
      {name: 'disable', value: '0x0'},
    ] as const;
    const {off, on} = resolveBooleanPair([...pair]);
    expect(on.value).toBe('0x1');
    expect(off.value).toBe('0x0');
  });

  it('resolves on/off by name when disable is first', () => {
    const pair = [
      {name: 'disable', value: '0x0'},
      {name: 'enable', value: '0x1'},
    ] as const;
    const {off, on} = resolveBooleanPair([...pair]);
    expect(on.value).toBe('0x1');
    expect(off.value).toBe('0x0');
  });

  it('resolves on/off for on/off synonym pairs', () => {
    const pair = [
      {name: 'On', value: '1'},
      {name: 'Off', value: '0'},
    ] as const;
    const {off, on} = resolveBooleanPair([...pair]);
    expect(on.value).toBe('1');
    expect(off.value).toBe('0');
  });
});
