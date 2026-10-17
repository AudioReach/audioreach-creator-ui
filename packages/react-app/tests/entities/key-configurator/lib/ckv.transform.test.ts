import {
  buildKeyDefinitionLookup,
  transformCkvsToConfiguredCkvs,
  transformConfiguredCkvsToCkvs,
  transformKeyDefinitionsToCalibrationKeys,
} from '~entities/key-configurator/lib/ckv.transform';

describe('transformKeyDefinitionsToCalibrationKeys', () => {
  it('keys the record by key name and nests values', () => {
    const result = transformKeyDefinitionsToCalibrationKeys([
      {
        enumMember: 'DEVICE',
        enumName: 'device_t',
        graphKeyEnumMember: 'DEVICE',
        isCalibrationKey: true,
        isDynamic: false,
        isGraphKey: false,
        isVoice: false,
        name: 'Device',
        naturalId: 1,
        systemId: 'key-1',
        values: [
          {
            enumMember: 'SPEAKER',
            name: 'Speaker',
            naturalId: 10,
            systemId: 'val-10',
          },
        ],
      },
    ]);
    expect(result.Device).toEqual({
      id: 1,
      name: 'Device',
      systemId: 'key-1',
      values: [{id: 10, name: 'Speaker', systemId: 'val-10'}],
    });
  });
});

describe('buildKeyDefinitionLookup', () => {
  it('indexes available keys by naturalId', () => {
    const graphKey = {id: 1, name: 'Device', systemId: 'key-1', values: []};
    const result = buildKeyDefinitionLookup({Device: graphKey});
    expect(result[1]).toBe(graphKey);
  });
});

describe('transformCkvsToConfiguredCkvs', () => {
  it('maps CkvDto to ConfiguredCkv using the key definition lookup', () => {
    const graphKey = {id: 1, name: 'Device', systemId: 'key-1', values: []};
    const result = transformCkvsToConfiguredCkvs(
      [
        {
          keyValuePairs: [
            {
              key: {name: 'Device', naturalId: 1, systemId: 'key-1'},
              value: {name: 'Speaker', naturalId: 10, systemId: 'val-10'},
            },
          ],
          supportedParameters: [
            {description: '', name: 'Gain', naturalId: 100, systemId: 'p-100'},
          ],
          systemId: 'ckv-1',
        },
      ],
      {1: graphKey},
    );
    expect(result).toEqual([
      {
        keyValuePairs: [
          {
            key: graphKey,
            value: {id: 10, name: 'Speaker', systemId: 'val-10'},
          },
        ],
        pidConfig: [100],
        systemId: 'ckv-1',
      },
    ]);
  });
});

describe('transformConfiguredCkvsToCkvs', () => {
  it('maps ConfiguredCkv back to CkvDto', () => {
    const graphKey = {id: 1, name: 'Device', systemId: 'key-1', values: []};
    const result = transformConfiguredCkvsToCkvs(
      [
        {
          keyValuePairs: [
            {
              key: graphKey,
              value: {id: 10, name: 'Speaker', systemId: 'val-10'},
            },
          ],
          pidConfig: [100],
          systemId: 'ckv-1',
        },
      ],
      {1: graphKey},
    );
    expect(result[0].keyValuePairs[0].key).toEqual({
      name: 'Device',
      naturalId: 1,
      systemId: 'key-1',
    });
    expect(result[0].systemId).toBe('ckv-1');
  });
});
