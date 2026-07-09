/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {elementKey} from '~features/generic-tree-view/lib/element-key';

describe('elementKey', () => {
  it('returns the parameterId alone when no path segments are provided', () => {
    expect(elementKey('param1')).toBe('param1');
  });

  it('joins parameterId and a single path segment with a slash', () => {
    expect(elementKey('param1', 'elementA')).toBe('param1/elementA');
  });

  it('joins parameterId and multiple path segments with slashes', () => {
    expect(elementKey('param1', 'struct', 'element')).toBe(
      'param1/struct/element',
    );
  });

  it('handles array index notation in path segments', () => {
    expect(elementKey('p', 'arr[0]', 'field')).toBe('p/arr[0]/field');
  });

  it('produces unique keys for different parameterIds with the same path', () => {
    const k1 = elementKey('pid1', 'elem');
    const k2 = elementKey('pid2', 'elem');
    expect(k1).not.toBe(k2);
  });

  it('preserves numeric parameterId strings', () => {
    expect(elementKey('12345', 'value')).toBe('12345/value');
  });
});
