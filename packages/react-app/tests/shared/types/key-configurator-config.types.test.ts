import type {
  ConfiguredCkv,
  ConfiguredTkv,
  CkvParameter,
  GraphKey,
  Key,
  KeyValue,
  TagGroup,
  TkvParameter,
} from '~shared/types/key-configurator-config.types';

describe('key-configurator-config.types', () => {
  it('GraphKey and KeyValue carry a systemId', () => {
    const value: KeyValue = {id: 1, name: 'v', systemId: 'sys-v'};
    const key: GraphKey = {
      id: 1,
      name: 'k',
      systemId: 'sys-k',
      values: [value],
    };
    expect(key.systemId).toBe('sys-k');
    expect(key.values[0].systemId).toBe('sys-v');
  });

  it('ConfiguredCkv and CkvParameter have the expected shape', () => {
    const ckv: ConfiguredCkv = {
      keyValuePairs: [
        {
          key: {id: 1, name: 'k', systemId: 'sys-k', values: []},
          value: {id: 1, name: 'v', systemId: 'sys-v'},
        },
      ],
      pidConfig: [10],
      systemId: 'ckv-1',
    };
    const param: CkvParameter = {checked: true, name: 'p', pid: 10};
    expect(ckv.pidConfig).toContain(param.pid);
  });

  it('TagGroup has the expected shape', () => {
    const key: Key = {id: 1, name: 'k', systemId: 'sys-k'};
    const value: KeyValue = {id: 1, name: 'v', systemId: 'sys-v'};
    const graphKey: GraphKey = {...key, values: [value]};
    const tagGroup: TagGroup = {
      id: 1,
      keys: {'sys-k': graphKey},
      name: 'tag-group',
    };
    expect(tagGroup.keys['sys-k'].values[0].systemId).toBe('sys-v');
  });

  it('ConfiguredTkv and TkvParameter have the expected shape', () => {
    const tkv: ConfiguredTkv = {
      keyValuePairs: [
        {
          key: {id: 1, name: 'k', systemId: 'sys-k'},
          value: {id: 1, name: 'v', systemId: 'sys-v'},
        },
      ],
      pidConfig: [10],
      systemId: 'tkv-1',
      tagGroup: 'tag-group',
      tagGroupId: 1,
    };
    const param: TkvParameter = {checked: true, name: 'p', pid: 10};
    expect(tkv.systemId).toBeDefined();
    expect(tkv.tagGroupId).toBeDefined();
    expect(tkv.keyValuePairs[0].key.systemId).toBeDefined();
    expect(tkv.pidConfig).toContain(param.pid);
  });
});
