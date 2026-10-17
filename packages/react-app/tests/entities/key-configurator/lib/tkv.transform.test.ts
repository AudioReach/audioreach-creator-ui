/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {SpfModuleDefinitionResponseDto} from '~entities/module-definitions';
import type {TagInfoDto} from '~entities/spf-module-data';
import {
  buildParamInfoLookup,
  buildTagDefinitionLookup,
  transformConfiguredTkvsToTags,
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
    });
  });
});

describe('buildTagDefinitionLookup', () => {
  const moduleTagKeys: Record<string, TagGroup> = {
    Volume: {
      id: 100,
      keys: {},
      name: 'Volume',
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

describe('buildParamInfoLookup', () => {
  const moduleDefinition: SpfModuleDefinitionResponseDto = {
    builtIn: true,
    description: 'Test module',
    displayName: 'Test Module',
    isCustomModule: false,
    isLoadedAtBootup: false,
    modSearchKeys: '',
    moduleInfo: {
      containerTypeInfo: [],
      dynamicIntents: [],
      inputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'sys1'},
      outputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'sys1'},
      pidFramework: 0,
      staticCtrlPorts: [],
    },
    name: 'TEST_MODULE',
    naturalId: 1,
    paramDefinitionsSummaryInfo: [
      {
        deprecated: false,
        description: 'Gain control',
        isHidden: false,
        isReadOnly: false,
        name: 'PARAM_ID_GAIN',
        naturalId: 100,
        pidType: 'STATIC',
        systemId: 'param-100',
        toolPolicy: 'READ_WRITE',
      },
    ],
    processorInfo: {name: 'ADSP', naturalId: 1, systemId: 'sys1'},
    systemId: 'sys1',
  };

  it('indexes parameter definitions by natural ID', () => {
    const result = buildParamInfoLookup(moduleDefinition);
    expect(result[100]).toEqual({name: 'PARAM_ID_GAIN', pid: 100});
  });

  it('returns an empty record when the module definition is undefined', () => {
    expect(buildParamInfoLookup(undefined)).toEqual({});
  });
});

describe('transformTagsToConfiguredTkvs', () => {
  const tagDefinitionsByNaturalId = buildTagDefinitionLookup({
    Volume: {
      id: 100,
      keys: {},
      name: 'Volume',
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
});

describe('transformConfiguredTkvsToTags', () => {
  const tagDefinitionsByNaturalId = buildTagDefinitionLookup({
    Volume: {
      id: 100,
      keys: {},
      name: 'Volume',
    },
  });
  const paramInfoByNaturalId = buildParamInfoLookup({
    builtIn: true,
    description: 'Test module',
    displayName: 'Test Module',
    isCustomModule: false,
    isLoadedAtBootup: false,
    modSearchKeys: '',
    moduleInfo: {
      containerTypeInfo: [],
      dynamicIntents: [],
      inputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'sys1'},
      outputDataPortInfo: {maxPorts: 0, ports: [], systemId: 'sys1'},
      pidFramework: 0,
      staticCtrlPorts: [],
    },
    name: 'TEST_MODULE',
    naturalId: 1,
    paramDefinitionsSummaryInfo: [
      {
        deprecated: false,
        description: 'Gain control',
        isHidden: false,
        isReadOnly: false,
        name: 'PARAM_ID_GAIN',
        naturalId: 100,
        pidType: 'STATIC',
        systemId: 'param-100',
        toolPolicy: 'READ_WRITE',
      },
    ],
    processorInfo: {name: 'ADSP', naturalId: 1, systemId: 'sys1'},
    systemId: 'sys1',
  });

  it('round-trips ConfiguredTkv back to TagInfoDto, grouped by tagGroupId', () => {
    const result = transformConfiguredTkvsToTags(
      [
        {
          keyValuePairs: [
            {
              key: {id: 1, name: 'Device', systemId: 'key-1'},
              value: {id: 10, name: 'Speaker', systemId: 'val-10'},
            },
          ],
          pidConfig: [100],
          systemId: 'tkv-sys-1',
          tagGroup: 'Volume',
          tagGroupId: 100,
        },
      ],
      tagDefinitionsByNaturalId,
      paramInfoByNaturalId,
    );

    expect(result).toEqual([
      {
        naturalId: 100,
        systemId: '',
        tagName: 'Volume',
        tkvs: [
          {
            keyValuePairs: [
              {
                key: {name: 'Device', naturalId: 1, systemId: 'key-1'},
                value: {name: 'Speaker', naturalId: 10, systemId: 'val-10'},
              },
            ],
            supportedParameters: [
              {
                description: '',
                name: 'PARAM_ID_GAIN',
                naturalId: 100,
                systemId: '',
              },
            ],
            systemId: 'tkv-sys-1',
          },
        ],
      },
    ]);
  });

  it('returns an empty array when given no configured TKVs', () => {
    expect(
      transformConfiguredTkvsToTags(
        [],
        tagDefinitionsByNaturalId,
        paramInfoByNaturalId,
      ),
    ).toEqual([]);
  });
});
