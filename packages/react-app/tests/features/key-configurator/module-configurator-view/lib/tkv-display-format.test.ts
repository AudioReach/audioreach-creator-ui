/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  formatConfiguredTkvLabel,
  formatTkvKeyValuePair,
} from '~features/key-configurator/module-configurator-view/lib/tkv-display-format';
import type {ConfiguredTkv} from '~shared/types/key-configurator-config.types';

describe('formatTkvKeyValuePair', () => {
  const pair = {
    key: {id: 1, name: 'DeviceRX', systemId: 'k1'},
    value: {id: 10, name: 'BT_Rx', systemId: 'v10'},
  };

  it('shows the bracketed key:value pair', () => {
    expect(formatTkvKeyValuePair(pair)).toBe('[DeviceRX: BT_Rx]');
  });
});

describe('formatConfiguredTkvLabel', () => {
  const tkv: ConfiguredTkv = {
    keyValuePairs: [
      {
        key: {id: 1, name: 'DeviceRX', systemId: 'k1'},
        value: {id: 10, name: 'BT_Rx', systemId: 'v10'},
      },
      {
        key: {id: 2, name: 'BtProfile', systemId: 'k2'},
        value: {id: 20, name: 'SCO', systemId: 'v20'},
      },
    ],
    pidConfig: [],
    systemId: 'tkv-1',
    tagGroup: 'Tag1',
    tagGroupId: 100,
  };

  it('joins bracketed key:value pairs with a space', () => {
    expect(formatConfiguredTkvLabel(tkv)).toBe(
      '[DeviceRX: BT_Rx] [BtProfile: SCO]',
    );
  });

  it('shows the bracketed tag group name when there are no key:value pairs', () => {
    expect(formatConfiguredTkvLabel({...tkv, keyValuePairs: []})).toBe(
      '[Tag1]',
    );
  });
});
