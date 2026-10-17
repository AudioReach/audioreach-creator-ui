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

  it('shows just the value name in value-only mode', () => {
    expect(formatTkvKeyValuePair(pair, 'value-only')).toBe('BT_Rx');
  });

  it('shows the bracketed key:value pair in key-value mode', () => {
    expect(formatTkvKeyValuePair(pair, 'key-value')).toBe('[DeviceRX: BT_Rx]');
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

  it('joins values only with + in value-only mode', () => {
    expect(formatConfiguredTkvLabel(tkv, 'value-only')).toBe('BT_Rx+SCO');
  });

  it('joins bracketed key:value pairs with a space in key-value mode', () => {
    expect(formatConfiguredTkvLabel(tkv, 'key-value')).toBe(
      '[DeviceRX: BT_Rx] [BtProfile: SCO]',
    );
  });
});
