/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {resolveKeyDisplayMode} from '~shared/lib/key-display-mode';

describe('resolveKeyDisplayMode', () => {
  it('maps keyvalues preference to key-value mode', () => {
    expect(resolveKeyDisplayMode('keyvalues')).toBe('key-value');
  });

  it('maps alias and values preferences to value-only mode', () => {
    expect(resolveKeyDisplayMode('alias')).toBe('value-only');
    expect(resolveKeyDisplayMode('values')).toBe('value-only');
  });
});
