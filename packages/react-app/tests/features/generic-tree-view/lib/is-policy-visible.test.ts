/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {isPolicyVisible} from '~features/generic-tree-view/lib/is-policy-visible';

describe('isPolicyVisible', () => {
  it('returns false for HIDDEN regardless of policyFilter', () => {
    expect(isPolicyVisible('HIDDEN', new Set(['BASIC', 'ADVANCED']))).toBe(
      false,
    );
  });

  it('returns false for BASIC when policyFilter excludes BASIC', () => {
    expect(isPolicyVisible('BASIC', new Set(['ADVANCED']))).toBe(false);
  });

  it('returns true for BASIC when policyFilter includes BASIC', () => {
    expect(isPolicyVisible('BASIC', new Set(['BASIC']))).toBe(true);
  });

  it('returns false for ADVANCED when policyFilter excludes ADVANCED', () => {
    expect(isPolicyVisible('ADVANCED', new Set(['BASIC']))).toBe(false);
  });

  it('returns true for ADVANCED when policyFilter includes ADVANCED', () => {
    expect(isPolicyVisible('ADVANCED', new Set(['ADVANCED']))).toBe(true);
  });

  it('returns true for undefined policy regardless of filter', () => {
    expect(isPolicyVisible(undefined, new Set())).toBe(true);
  });
});
