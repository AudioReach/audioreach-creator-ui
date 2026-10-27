/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {areNumericStringsEqual} from '~shared/lib/numeric-string';

describe('areNumericStringsEqual', () => {
  it('does not round an unsafe integer when compared with float syntax', () => {
    expect(
      areNumericStringsEqual('0x20000000000001', '9007199254740992.0'),
    ).toBe(false);
  });

  it('matches an unsafe integer with an equivalent decimal float representation', () => {
    expect(
      areNumericStringsEqual('0x20000000000000', '9007199254740992.0'),
    ).toBe(true);
  });
});
