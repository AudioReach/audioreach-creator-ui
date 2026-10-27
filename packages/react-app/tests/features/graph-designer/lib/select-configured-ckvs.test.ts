/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {selectConfiguredCkvs} from '~features/graph-designer/lib/select-configured-ckvs';
import type {GraphDesignerStore} from '~features/graph-designer/model/graph-designer-store';

function makeState(
  overrides: Partial<GraphDesignerStore> = {},
): GraphDesignerStore {
  return {
    availableCalibrationKeys: {},
    graphData: {moduleInstances: {}},
    ...overrides,
  } as GraphDesignerStore;
}

describe('selectConfiguredCkvs', () => {
  it('returns an empty array when the module instance has no ckvs', () => {
    const state = makeState({
      graphData: {moduleInstances: {'mod-1': {ckvs: []}}},
    } as unknown as Partial<GraphDesignerStore>);
    expect(selectConfiguredCkvs(state, 'mod-1')).toEqual([]);
  });

  it('returns an empty array when the module instance is missing', () => {
    expect(selectConfiguredCkvs(makeState(), 'missing')).toEqual([]);
  });

  it('transforms ckvs using the available calibration key definitions', () => {
    const graphKey = {id: 1, name: 'Device', systemId: 'k1', values: []};
    const state = makeState({
      availableCalibrationKeys: {Device: graphKey},
      graphData: {
        moduleInstances: {
          'mod-1': {
            ckvs: [
              {
                keyValuePairs: [
                  {
                    key: {name: 'Device', naturalId: 1, systemId: 'k1'},
                    value: {name: 'Speaker', naturalId: 10, systemId: 'v10'},
                  },
                ],
                supportedParameters: [],
                systemId: 'ckv-1',
              },
            ],
          },
        },
      },
    } as unknown as Partial<GraphDesignerStore>);
    const result = selectConfiguredCkvs(state, 'mod-1');
    expect(result[0].keyValuePairs[0].key).toBe(graphKey);
  });
});
