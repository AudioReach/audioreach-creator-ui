/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {findOptionName} from '~features/generic-tree-view/lib/find-option-name';

describe('findOptionName', () => {
  it('matches numerically equivalent decimal and hex values', () => {
    expect(
      findOptionName(
        [
          {name: 'Disable', value: '0x0'},
          {name: 'Enable', value: '0x1'},
        ],
        '1',
      ),
    ).toBe('Enable');
  });
});
