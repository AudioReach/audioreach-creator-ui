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
});
