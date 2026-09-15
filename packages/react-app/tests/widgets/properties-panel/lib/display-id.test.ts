/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {formatDisplayId} from '~widgets/properties-panel/lib/display-id';

describe('formatDisplayId', () => {
  it('formats decimal numeric ids as minimal-width uppercase hex', () => {
    expect(formatDisplayId('100')).toBe('0x64');
    expect(formatDisplayId('0')).toBe('0x0');
  });

  it('normalizes existing hex ids to minimal-width uppercase hex', () => {
    expect(formatDisplayId('0x00000064')).toBe('0x64');
    expect(formatDisplayId('0xff')).toBe('0xFF');
  });

  it('leaves non-numeric ids unchanged', () => {
    expect(formatDisplayId('mod-1')).toBe('mod-1');
    expect(formatDisplayId('in-1a')).toBe('in-1a');
    expect(formatDisplayId('')).toBe('');
  });
});
