/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createModuleTagKeyConfigSlice} from '~features/graph-designer/model/module-tag-key-config-slice';

jest.mock('~entities/key-definitions', () => ({
  getAllTagDefinitions: jest.fn(),
}));
jest.mock('~entities/spf-module-data', () => ({
  createTags: jest.fn(),
  createTkvParameters: jest.fn(),
  createTkvs: jest.fn(),
  deleteTags: jest.fn(),
  deleteTkvParameters: jest.fn(),
  deleteTkvs: jest.fn(),
}));
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

import {getAllTagDefinitions} from '~entities/key-definitions';
import {
  createTags,
  createTkvParameters,
  createTkvs,
  deleteTags,
  deleteTkvParameters,
  deleteTkvs,
} from '~entities/spf-module-data';

const mockedGetAllTagDefinitions = getAllTagDefinitions as jest.Mock;
const mockedCreateTags = createTags as jest.Mock;
const mockedCreateTkvs = createTkvs as jest.Mock;
const mockedCreateTkvParameters = createTkvParameters as jest.Mock;
const mockedDeleteTags = deleteTags as jest.Mock;
const mockedDeleteTkvs = deleteTkvs as jest.Mock;
const mockedDeleteTkvParameters = deleteTkvParameters as jest.Mock;

const tagGroupFixture = {
  CatalogTagGroup: {
    id: 100,
    keys: {
      Device: {id: 1, name: 'Device', systemId: 'k1', values: []},
    },
    name: 'CatalogTagGroup',
    systemId: 'tag-def-1',
  },
};

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
  const slice = createModuleTagKeyConfigSlice(set, get, 'proj-1');
  Object.assign(state, slice);
  return {get, set, slice};
}

describe('createModuleTagKeyConfigSlice', () => {
  beforeEach(() => {
    mockedGetAllTagDefinitions.mockReset();
    mockedCreateTags.mockReset();
    mockedCreateTkvs.mockReset();
    mockedCreateTkvParameters.mockReset();
    mockedDeleteTags.mockReset();
    mockedDeleteTkvs.mockReset();
    mockedDeleteTkvParameters.mockReset();
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

  describe('addTkvs', () => {
    it('creates a new tag, TKVs, and parameters when the tag does not exist yet', async () => {
      mockedCreateTags.mockResolvedValue({
        data: [{naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'}],
        issues: [],
      });
      mockedCreateTkvs.mockResolvedValue({
        data: [
          {keyValuePairs: [], supportedParameters: [], systemId: 'tkv-1'},
        ],
        issues: [],
      });
      mockedCreateTkvParameters.mockResolvedValue({
        data: {
          tkvParameters: [
            {
              parameters: [
                {description: '', name: 'PARAM', naturalId: 5, systemId: 'p5'},
              ],
              tkvSystemId: 'tkv-1',
            },
          ],
        },
        issues: [],
      });
      const {get, set} = makeHarness();
      set({moduleTagKeys: tagGroupFixture});

      const result = await get().addTkvs('mod-1', 100, [['v10']], ['p5']);

      expect(result).toBe(true);
      expect(mockedCreateTags).toHaveBeenCalledWith('proj-1', 'mod-1', {
        tagDefinitionSystemIds: ['tag-def-1'],
      });
      expect(mockedCreateTkvs).toHaveBeenCalledWith(
        'proj-1',
        'mod-1',
        'tag-1',
        {tkvs: [{valueSystemIds: ['v10']}]},
      );
      expect(mockedCreateTkvParameters).toHaveBeenCalledWith('proj-1', 'mod-1', {
        updates: [{parameterSystemIds: ['p5'], tkvSystemId: 'tkv-1'}],
      });
      expect(get().graphData.moduleInstances['mod-1'].tags).toEqual([
        {
          naturalId: 100,
          systemId: 'tag-1',
          tagName: 'CatalogTagGroup',
          tkvs: [
            {
              keyValuePairs: [],
              supportedParameters: [
                {description: '', name: 'PARAM', naturalId: 5, systemId: 'p5'},
              ],
              systemId: 'tkv-1',
            },
          ],
        },
      ]);
    });

    it('stops after creating an empty tag when no value combinations are given', async () => {
      mockedCreateTags.mockResolvedValue({
        data: [{naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'}],
        issues: [],
      });
      const {get, set} = makeHarness();
      set({moduleTagKeys: tagGroupFixture});

      const result = await get().addTkvs('mod-1', 100, [], []);

      expect(result).toBe(true);
      expect(mockedCreateTkvs).not.toHaveBeenCalled();
      expect(get().graphData.moduleInstances['mod-1'].tags).toEqual([
        {naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'},
      ]);
    });

    it('reuses an existing tag instead of calling createTags again', async () => {
      mockedCreateTkvs.mockResolvedValue({
        data: [
          {keyValuePairs: [], supportedParameters: [], systemId: 'tkv-2'},
        ],
        issues: [],
      });
      const {get, set} = makeHarness();
      set({
        graphData: {
          moduleInstances: {
            'mod-1': {
              moduleDefinitionSystemId: 'def-1',
              systemId: 'mod-1',
              tags: [
                {naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'},
              ],
            },
          },
        },
        moduleTagKeys: tagGroupFixture,
      });

      const result = await get().addTkvs('mod-1', 100, [['v10']], []);

      expect(result).toBe(true);
      expect(mockedCreateTags).not.toHaveBeenCalled();
      expect(mockedCreateTkvs).toHaveBeenCalledWith(
        'proj-1',
        'mod-1',
        'tag-1',
        {tkvs: [{valueSystemIds: ['v10']}]},
      );
    });

    it('returns false and shows a toast when createTags has a blocking issue', async () => {
      mockedCreateTags.mockResolvedValue({
        data: undefined,
        issues: [{code: 'ERR', message: 'boom', severity: 'ERROR'}],
      });
      const {get, set} = makeHarness();
      set({moduleTagKeys: tagGroupFixture});

      const result = await get().addTkvs('mod-1', 100, [['v10']], []);

      expect(result).toBe(false);
      expect(mockedCreateTkvs).not.toHaveBeenCalled();
    });
  });

  describe('deleteTagGroup', () => {
    it('deletes the tag and writes the filtered tag list through updateModuleTagsLocal', async () => {
      mockedDeleteTags.mockResolvedValue({
        data: [{naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'}],
        issues: [],
      });
      const {get, set} = makeHarness();
      set({
        graphData: {
          moduleInstances: {
            'mod-1': {
              moduleDefinitionSystemId: 'def-1',
              systemId: 'mod-1',
              tags: [
                {naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'},
                {naturalId: 200, systemId: 'tag-2', tagName: 'Other'},
              ],
            },
          },
        },
      });

      const result = await get().deleteTagGroup('mod-1', 100);

      expect(result).toBe(true);
      expect(mockedDeleteTags).toHaveBeenCalledWith('proj-1', 'mod-1', {
        tagSystemIds: ['tag-1'],
      });
      expect(get().graphData.moduleInstances['mod-1'].tags).toEqual([
        {naturalId: 200, systemId: 'tag-2', tagName: 'Other'},
      ]);
    });

    it('returns false when the tag group is not present on the instance', async () => {
      const {get} = makeHarness();

      const result = await get().deleteTagGroup('mod-1', 999);

      expect(result).toBe(false);
      expect(mockedDeleteTags).not.toHaveBeenCalled();
    });

    it('returns false and shows a toast on a blocking issue', async () => {
      mockedDeleteTags.mockResolvedValue({
        data: undefined,
        issues: [{code: 'ERR', message: 'boom', severity: 'ERROR'}],
      });
      const {get, set} = makeHarness();
      set({
        graphData: {
          moduleInstances: {
            'mod-1': {
              moduleDefinitionSystemId: 'def-1',
              systemId: 'mod-1',
              tags: [
                {naturalId: 100, systemId: 'tag-1', tagName: 'CatalogTagGroup'},
              ],
            },
          },
        },
      });

      const result = await get().deleteTagGroup('mod-1', 100);

      expect(result).toBe(false);
    });
  });

  describe('deleteTkvs', () => {
    it('groups targets by tag and writes the filtered TKVs through updateModuleTagsLocal', async () => {
      mockedDeleteTkvs.mockResolvedValue({
        data: [{keyValuePairs: [], supportedParameters: [], systemId: 'tkv-1'}],
        issues: [],
      });
      const {get, set} = makeHarness();
      set({
        graphData: {
          moduleInstances: {
            'mod-1': {
              moduleDefinitionSystemId: 'def-1',
              systemId: 'mod-1',
              tags: [
                {
                  naturalId: 100,
                  systemId: 'tag-1',
                  tagName: 'CatalogTagGroup',
                  tkvs: [
                    {
                      keyValuePairs: [],
                      supportedParameters: [],
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
      });

      const result = await get().deleteTkvs('mod-1', [
        {tagGroupId: 100, tkvSystemId: 'tkv-1'},
      ]);

      expect(result).toBe(true);
      expect(mockedDeleteTkvs).toHaveBeenCalledWith('proj-1', 'mod-1', 'tag-1', {
        tkvSystemIds: ['tkv-1'],
      });
      expect(
        get().graphData.moduleInstances['mod-1'].tags[0].tkvs,
      ).toEqual([{keyValuePairs: [], supportedParameters: [], systemId: 'tkv-2'}]);
    });

    it('returns false and shows a toast when a delete call has a blocking issue', async () => {
      mockedDeleteTkvs.mockResolvedValue({
        data: undefined,
        issues: [{code: 'ERR', message: 'boom', severity: 'ERROR'}],
      });
      const {get, set} = makeHarness();
      set({
        graphData: {
          moduleInstances: {
            'mod-1': {
              moduleDefinitionSystemId: 'def-1',
              systemId: 'mod-1',
              tags: [
                {
                  naturalId: 100,
                  systemId: 'tag-1',
                  tagName: 'CatalogTagGroup',
                  tkvs: [
                    {
                      keyValuePairs: [],
                      supportedParameters: [],
                      systemId: 'tkv-1',
                    },
                  ],
                },
              ],
            },
          },
        },
      });

      const result = await get().deleteTkvs('mod-1', [
        {tagGroupId: 100, tkvSystemId: 'tkv-1'},
      ]);

      expect(result).toBe(false);
    });
  });

  describe('updateTkvParameters', () => {
    const baseTags = () => ({
      graphData: {
        moduleInstances: {
          'mod-1': {
            moduleDefinitionSystemId: 'def-1',
            systemId: 'mod-1',
            tags: [
              {
                naturalId: 100,
                systemId: 'tag-1',
                tagName: 'CatalogTagGroup',
                tkvs: [
                  {
                    keyValuePairs: [],
                    supportedParameters: [
                      {description: '', name: 'A', naturalId: 1, systemId: 'p1'},
                    ],
                    systemId: 'tkv-1',
                  },
                ],
              },
            ],
          },
        },
      },
    });

    it('adds new parameters via createTkvParameters', async () => {
      mockedCreateTkvParameters.mockResolvedValue({
        data: {
          tkvParameters: [
            {
              parameters: [
                {description: '', name: 'A', naturalId: 1, systemId: 'p1'},
                {description: '', name: 'B', naturalId: 2, systemId: 'p2'},
              ],
              tkvSystemId: 'tkv-1',
            },
          ],
        },
        issues: [],
      });
      const {get, set} = makeHarness();
      set(baseTags());

      const result = await get().updateTkvParameters('mod-1', 'tkv-1', [
        'p1',
        'p2',
      ]);

      expect(result).toBe(true);
      expect(mockedCreateTkvParameters).toHaveBeenCalledWith('proj-1', 'mod-1', {
        updates: [{parameterSystemIds: ['p2'], tkvSystemId: 'tkv-1'}],
      });
      expect(mockedDeleteTkvParameters).not.toHaveBeenCalled();
      expect(
        get().graphData.moduleInstances['mod-1'].tags[0].tkvs[0]
          .supportedParameters,
      ).toEqual([
        {description: '', name: 'A', naturalId: 1, systemId: 'p1'},
        {description: '', name: 'B', naturalId: 2, systemId: 'p2'},
      ]);
    });

    it('removes parameters via deleteTkvParameters', async () => {
      mockedDeleteTkvParameters.mockResolvedValue({
        data: {
          updates: [{removedParameterSystemIds: ['p1'], tkvSystemId: 'tkv-1'}],
        },
        issues: [],
      });
      const {get, set} = makeHarness();
      set(baseTags());

      const result = await get().updateTkvParameters('mod-1', 'tkv-1', []);

      expect(result).toBe(true);
      expect(mockedCreateTkvParameters).not.toHaveBeenCalled();
      expect(mockedDeleteTkvParameters).toHaveBeenCalledWith('proj-1', 'mod-1', {
        updates: [{parameterSystemIds: ['p1'], tkvSystemId: 'tkv-1'}],
      });
      expect(
        get().graphData.moduleInstances['mod-1'].tags[0].tkvs[0]
          .supportedParameters,
      ).toEqual([]);
    });

    it('returns false when the TKV cannot be found', async () => {
      const {get, set} = makeHarness();
      set(baseTags());

      const result = await get().updateTkvParameters('mod-1', 'missing', ['p1']);

      expect(result).toBe(false);
      expect(mockedCreateTkvParameters).not.toHaveBeenCalled();
    });

    it('returns false and shows a toast on a blocking issue', async () => {
      mockedCreateTkvParameters.mockResolvedValue({
        data: undefined,
        issues: [{code: 'ERR', message: 'boom', severity: 'ERROR'}],
      });
      const {get, set} = makeHarness();
      set(baseTags());

      const result = await get().updateTkvParameters('mod-1', 'tkv-1', [
        'p1',
        'p2',
      ]);

      expect(result).toBe(false);
    });
  });
});
