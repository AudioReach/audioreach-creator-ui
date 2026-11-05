/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TagInfoDto} from '~entities/spf-module-data';
import {
  buildTagDefinitionLookup,
  transformTagDefinitionsToTagGroups,
  transformTagsToConfiguredTkvs,
} from '~entities/key-configurator/lib/tkv.transform';
import type {TagGroup} from '~shared/types/key-configurator-config.types';

describe('transformTagDefinitionsToTagGroups', () => {
  it('keys the record by tag name and nests key definitions', () => {
    const result = transformTagDefinitionsToTagGroups([
      {
        keyDefinitions: [
          {
            cHeaderEnumValue: 'DEVICE',
            name: 'Device',
            naturalId: 1,
            systemId: 'key-1',
            values: [{name: 'Speaker', naturalId: 10, systemId: 'val-10'}],
          },
        ],
        name: 'Volume',
        naturalId: 100,
        systemId: 'tag-100',
      },
    ]);
    expect(result.Volume).toEqual({
      id: 100,
      keys: {
        Device: {
          id: 1,
          name: 'Device',
          systemId: 'key-1',
          values: [{id: 10, name: 'Speaker', systemId: 'val-10'}],
        },
      },
      name: 'Volume',
      systemId: 'tag-100',
    });
  });
});

describe('buildTagDefinitionLookup', () => {
  const moduleTagKeys: Record<string, TagGroup> = {
    Volume: {
      id: 100,
      keys: {},
      name: 'Volume',
      systemId: 'tag-100',
    },
  };

  it('indexes tag groups by natural ID', () => {
    const result = buildTagDefinitionLookup(moduleTagKeys);
    expect(result[100]).toEqual({
      tagGroup: moduleTagKeys.Volume,
      tagGroupId: 100,
      tagGroupName: 'Volume',
    });
  });
});

describe('transformTagsToConfiguredTkvs', () => {
  const tagDefinitionsByNaturalId = buildTagDefinitionLookup({
    Volume: {
      id: 100,
      keys: {},
      name: 'Volume',
      systemId: 'tag-100',
    },
  });

  it('maps TagInfoDto to ConfiguredTkv using the tag definition lookup', () => {
    const tags: TagInfoDto[] = [
      {
        naturalId: 100,
        systemId: 'tag-sys-1',
        tagName: 'Volume',
        tkvs: [
          {
            keyValuePairs: [
              {
                key: {name: 'Device', naturalId: 1, systemId: 'key-1'},
                value: {name: 'Speaker', naturalId: 10, systemId: 'val-10'},
              },
              {
                key: {name: 'Direction', naturalId: 2, systemId: 'key-2'},
                value: {name: 'Rx', naturalId: 20, systemId: 'val-20'},
              },
            ],
            supportedParameters: [
              {
                description: '',
                name: 'PARAM_ID_GAIN',
                naturalId: 100,
                systemId: 'param-100',
              },
            ],
            systemId: 'tkv-sys-1',
          },
        ],
      },
    ];

    const result = transformTagsToConfiguredTkvs(
      tags,
      tagDefinitionsByNaturalId,
    );

    expect(result).toEqual([
      {
        keyValuePairs: [
          {
            key: {id: 1, name: 'Device', systemId: 'key-1'},
            value: {id: 10, name: 'Speaker', systemId: 'val-10'},
          },
          {
            key: {id: 2, name: 'Direction', systemId: 'key-2'},
            value: {id: 20, name: 'Rx', systemId: 'val-20'},
          },
        ],
        pidConfig: [100],
        systemId: 'tkv-sys-1',
        tagGroup: 'Volume',
        tagGroupId: 100,
      },
    ]);
  });

  it('returns an empty array when given no tags', () => {
    expect(
      transformTagsToConfiguredTkvs([], tagDefinitionsByNaturalId),
    ).toEqual([]);
  });

  it('maps a tag with no TKVs to a module-tag row with no key-values or PIDs', () => {
    const tags: TagInfoDto[] = [
      {
        naturalId: 100,
        systemId: 'tag-sys-1',
        tagName: 'Volume',
      },
    ];

    const result = transformTagsToConfiguredTkvs(
      tags,
      tagDefinitionsByNaturalId,
    );

    expect(result).toEqual([
      {
        keyValuePairs: [],
        pidConfig: [],
        systemId: 'tag-sys-1',
        tagGroup: 'Volume',
        tagGroupId: 100,
      },
    ]);
  });

  it('maps a tag with an empty tkvs array the same as an absent tkvs field', () => {
    const tags: TagInfoDto[] = [
      {
        naturalId: 100,
        systemId: 'tag-sys-1',
        tagName: 'Volume',
        tkvs: [],
      },
    ];

    expect(
      transformTagsToConfiguredTkvs(tags, tagDefinitionsByNaturalId),
    ).toEqual([
      {
        keyValuePairs: [],
        pidConfig: [],
        systemId: 'tag-sys-1',
        tagGroup: 'Volume',
        tagGroupId: 100,
      },
    ]);
  });
});
