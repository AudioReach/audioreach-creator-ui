/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {parseHexOrDec} from '~features/generic-tree-view/lib/parse-hex-or-dec';

jest.mock('~shared/lib/logger');

describe('parseHexOrDec', () => {
  it('parses a lowercase hex string', () => {
    expect(parseHexOrDec('0x0000001a')).toBe(26);
  });

  it('parses an uppercase hex string', () => {
    expect(parseHexOrDec('0X0000001A')).toBe(26);
  });

  it('parses a decimal string', () => {
    expect(parseHexOrDec('255')).toBe(255);
  });

  it('returns NaN for an empty string', () => {
    expect(parseHexOrDec('')).toBeNaN();
  });

  it('returns NaN for a whitespace-only string', () => {
    expect(parseHexOrDec('   ')).toBeNaN();
  });

  it('strips leading/trailing whitespace before parsing', () => {
    expect(parseHexOrDec('  42  ')).toBe(42);
  });

  it('strips whitespace before parsing hex', () => {
    expect(parseHexOrDec('  0x10  ')).toBe(16);
  });

  it.each([
    ['10', 10],
    [' 10 ', 10],
    ['-10', -10],
    ['+10', 10],
    ['0xFF', 255],
    ['0Xff', 255],
    ['-0xFF', -255],
  ])('parses the complete integer %s', (value, expected) => {
    expect(parseHexOrDec(String(value))).toBe(expected);
  });

  it.each([
    '10x00000000',
    '0x12junk',
    '0x',
    '',
    ' ',
    '1 2',
    '10abc',
    'NaN',
    'Infinity',
    '1.5',
    '1e2',
  ])('rejects the malformed integer %p', (value) => {
    expect(parseHexOrDec(value)).toBeNaN();
  });

  it.each(['Float', 'Double'])('preserves %s decimal fractions', (dataType) => {
    expect(parseHexOrDec('0.75', dataType)).toBe(0.75);
    expect(parseHexOrDec('-1.5e-2', dataType)).toBe(-0.015);
    expect(parseHexOrDec('.5', dataType)).toBe(0.5);
  });

  it.each(['0.75junk', '1e', '1e999', 'NaN', 'Infinity'])(
    'rejects the malformed float %p',
    (value) => {
      expect(parseHexOrDec(value, 'Float')).toBeNaN();
    },
  );
});
