/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {formatCkvEntry} from '~features/key-configurator/module-configurator-view/lib/ckv-display-format';

describe('formatCkvEntry', () => {
  const pairs = [
    {
      key: {id: 1, name: 'Device', systemId: 'k1', values: []},
      value: {id: 10, name: 'Speaker', systemId: 'v10'},
    },
    {
      key: {id: 2, name: 'Mode', systemId: 'k2', values: []},
      value: {id: 20, name: 'Call', systemId: 'v20'},
    },
  ];

  it('shows bracketed key:value pairs joined by a space', () => {
    expect(formatCkvEntry(pairs)).toBe('[Device: Speaker] [Mode: Call]');
  });

  it('shows "Zero" when keyValuePairs is empty', () => {
    expect(formatCkvEntry([])).toBe('Zero');
  });
});
