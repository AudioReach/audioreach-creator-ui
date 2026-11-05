/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {selectConfiguredTkvs} from '~features/graph-designer/lib/select-configured-tkvs';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';

function makeState(
  overrides: Partial<GraphDesignerStore> = {},
): GraphDesignerStore {
  return {
    graphData: {moduleInstances: {}},
    moduleTagKeys: {},
    ...overrides,
  } as GraphDesignerStore;
}

describe('selectConfiguredTkvs', () => {
  it('returns an empty array when the module instance has no tags', () => {
    const state = makeState({
      graphData: {moduleInstances: {'mod-1': {tags: []}}},
    } as unknown as Partial<GraphDesignerStore>);
    expect(selectConfiguredTkvs(state, 'mod-1')).toEqual([]);
  });

  it('returns an empty array when the module instance is missing', () => {
    expect(selectConfiguredTkvs(makeState(), 'missing')).toEqual([]);
  });

  it('returns an empty array when graphData is null', () => {
    const state = makeState({graphData: null});
    expect(selectConfiguredTkvs(state, 'mod-1')).toEqual([]);
  });

  it('transforms tags using the module tag key definitions in state', () => {
    const state = makeState({
      graphData: {
        moduleInstances: {
          'mod-1': {
            tags: [
              {
                naturalId: 100,
                systemId: 'tag-100',
                tagName: 'RawTagName',
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
                ],
              },
            ],
          },
        },
      },
      moduleTagKeys: {
        CatalogTagGroup: {
          id: 100,
          keys: {
            Device: {id: 1, name: 'Device', systemId: 'k1', values: []},
          },
          name: 'CatalogTagGroup',
        },
      },
    } as unknown as Partial<GraphDesignerStore>);

    const result = selectConfiguredTkvs(state, 'mod-1');

    expect(result).toEqual([
      {
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
      },
    ]);
  });
});
