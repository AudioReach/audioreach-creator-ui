/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createModuleTagKeyConfigSlice} from '~features/graph-designer/model/module-tag-key-config-slice';

jest.mock('~entities/key-definitions', () => ({
  getAllTagDefinitions: jest.fn(),
}));
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

import {getAllTagDefinitions} from '~entities/key-definitions';

const mockedGetAllTagDefinitions = getAllTagDefinitions as jest.Mock;

function makeHarness() {
  let state: Record<string, unknown> = {
    graphData: {
      moduleInstances: {
        'mod-1': {
          moduleDefinitionSystemId: 'def-1',
          systemId: 'mod-1',
          tags: [],
        },
      },
    },
    moduleDefinitionsBySystemId: {
      'def-1': {
        paramDefinitionsSummaryInfo: [{name: 'param1', naturalId: 5}],
      },
    },
    updateModuleTagsLocal: jest.fn((id: string, tags: unknown) => {
      const graphData = state.graphData as {
        moduleInstances: Record<string, Record<string, unknown>>;
      };
      state = {
        ...state,
        graphData: {
          moduleInstances: {
            ...graphData.moduleInstances,
            [id]: {...graphData.moduleInstances[id], tags},
          },
        },
      };
    }),
  };
  const set = (partial: object) => {
    state = {...state, ...partial};
  };
  // slice is created once and never mutates its own closed-over properties
  // after that, so state (updated by `set`) must win over the stale initial
  // slice snapshot — hence `...slice` first, `...state` last.
  const get = () => ({...slice, ...state}) as never;
  const slice = createModuleTagKeyConfigSlice(set, get);
  Object.assign(state, slice);
  return {get, set, slice};
}

const tagGroupFixture = {
  CatalogTagGroup: {
    id: 100,
    keys: {
      Device: {id: 1, name: 'Device', systemId: 'k1', values: []},
    },
    name: 'CatalogTagGroup',
  },
};

const configuredTkvFixture = {
  keyValuePairs: [
    {
      key: {id: 1, name: 'Device', systemId: 'k1'},
      value: {id: 10, name: 'Speaker', systemId: 'v10'},
    },
  ],
  pidConfig: [5],
  systemId: 'tkv-1',
  tagGroup: 'CatalogTagGroup',
  tagGroupId: 100,
};

const expectedTagInfoFixture = [
  {
    naturalId: 100,
    systemId: '',
    tagName: 'CatalogTagGroup',
    tkvs: [
      {
        keyValuePairs: [
          {
            key: {name: 'Device', naturalId: 1, systemId: 'k1'},
            value: {name: 'Speaker', naturalId: 10, systemId: 'v10'},
          },
        ],
        supportedParameters: [
          {description: '', name: 'param1', naturalId: 5, systemId: ''},
        ],
        systemId: 'tkv-1',
      },
    ],
  },
];

describe('createModuleTagKeyConfigSlice', () => {
  beforeEach(() => {
    mockedGetAllTagDefinitions.mockReset();
  });

  it('starts with no module tag keys', () => {
    const {slice} = makeHarness();
    expect(slice.moduleTagKeys).toEqual({});
  });

  it('initializeModuleTagKeyConfiguration populates moduleTagKeys and returns true on success', async () => {
    mockedGetAllTagDefinitions.mockResolvedValue({
      data: [
        {
          keyDefinitions: [
            {name: 'Device', naturalId: 1, systemId: 'k1', values: []},
          ],
          name: 'CatalogTagGroup',
          naturalId: 100,
          systemId: 'tag-def-1',
        },
      ],
      issues: [],
    });
    const {get, slice} = makeHarness();

    const result = await slice.initializeModuleTagKeyConfiguration('proj-1');

    expect(result).toBe(true);
    expect(get().moduleTagKeys).toEqual(tagGroupFixture);
  });

  it('initializeModuleTagKeyConfiguration returns false and leaves moduleTagKeys untouched on a blocking issue', async () => {
    mockedGetAllTagDefinitions.mockResolvedValue({
      data: undefined,
      issues: [{code: 'ERR', message: 'boom', severity: 'ERROR'}],
    });
    const {get, slice} = makeHarness();

    const result = await slice.initializeModuleTagKeyConfiguration('proj-1');

    expect(result).toBe(false);
    expect(get().moduleTagKeys).toEqual({});
  });

  it('initializeModuleTagKeyConfiguration returns false and leaves moduleTagKeys untouched on rejection', async () => {
    mockedGetAllTagDefinitions.mockRejectedValue(new Error('network error'));
    const {get, slice} = makeHarness();

    const result = await slice.initializeModuleTagKeyConfiguration('proj-1');

    expect(result).toBe(false);
    expect(get().moduleTagKeys).toEqual({});
  });

  it('resetModuleTagKeyConfiguration clears moduleTagKeys', () => {
    const {get, set, slice} = makeHarness();
    set({moduleTagKeys: tagGroupFixture});
    expect(get().moduleTagKeys).toEqual(tagGroupFixture);

    slice.resetModuleTagKeyConfiguration();

    expect(get().moduleTagKeys).toEqual({});
  });

  it('addConfiguredTkv appends the new entry and writes through updateModuleTagsLocal', () => {
    const {get, set, slice} = makeHarness();
    set({moduleTagKeys: tagGroupFixture});

    slice.addConfiguredTkv('mod-1', configuredTkvFixture);

    expect(get().updateModuleTagsLocal).toHaveBeenCalledWith(
      'mod-1',
      expectedTagInfoFixture,
    );
  });

  it('removeConfiguredTkv removes the entry at index and writes through updateModuleTagsLocal', () => {
    const {get, set, slice} = makeHarness();
    set({
      graphData: {
        moduleInstances: {
          'mod-1': {
            moduleDefinitionSystemId: 'def-1',
            systemId: 'mod-1',
            tags: [
              {
                naturalId: 100,
                systemId: 'tag-100',
                tagName: 'CatalogTagGroup',
                tkvs: [
                  {
                    keyValuePairs: [
                      {
                        key: {name: 'Device', naturalId: 1, systemId: 'k1'},
                        value: {
                          name: 'Speaker',
                          naturalId: 10,
                          systemId: 'v10',
                        },
                      },
                    ],
                    supportedParameters: [
                      {
                        description: '',
                        name: 'param1',
                        naturalId: 5,
                        systemId: 'p5',
                      },
                    ],
                    systemId: 'tkv-1',
                  },
                  {
                    keyValuePairs: [],
                    supportedParameters: [],
                    systemId: 'tkv-2',
                  },
                ],
              },
            ],
          },
        },
      },
      moduleTagKeys: tagGroupFixture,
    });

    slice.removeConfiguredTkv('mod-1', 0);

    expect(get().updateModuleTagsLocal).toHaveBeenCalledWith('mod-1', [
      {
        naturalId: 100,
        systemId: '',
        tagName: 'CatalogTagGroup',
        tkvs: [
          {
            keyValuePairs: [],
            supportedParameters: [],
            systemId: 'tkv-2',
          },
        ],
      },
    ]);
  });

  it('updateConfiguredTkvs replaces the full list and writes through updateModuleTagsLocal', () => {
    const {get, set, slice} = makeHarness();
    set({moduleTagKeys: tagGroupFixture});

    slice.updateConfiguredTkvs('mod-1', [configuredTkvFixture]);

    expect(get().updateModuleTagsLocal).toHaveBeenCalledWith(
      'mod-1',
      expectedTagInfoFixture,
    );
  });
});
