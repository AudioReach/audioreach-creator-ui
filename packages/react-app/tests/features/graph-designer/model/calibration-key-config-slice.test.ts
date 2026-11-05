import {createCalibrationKeyConfigSlice} from '~features/graph-designer/model/calibration-key-config-slice';

jest.mock('~entities/key-definitions', () => ({
  getAllKeyDefinitions: jest.fn(),
}));
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeHarness(overrides: Record<string, unknown> = {}) {
  let state: Record<string, unknown> = {
    calibrationKeys: {},
    graphData: {moduleInstances: {'mod-1': {ckvs: [], systemId: 'mod-1'}}},
    ...overrides,
    updateModuleCkvsLocal: jest.fn((id, ckvs) => {
      state = {
        ...state,
        graphData: {
          moduleInstances: {
            ...(state.graphData as {moduleInstances: object}).moduleInstances,
            [id]: {ckvs, systemId: id},
          },
        },
      };
    }),
  };
  const set = (partial: object) => {
    state = {...state, ...partial};
  };
  const get = () => ({...state, ...slice}) as never;
  const slice = createCalibrationKeyConfigSlice(set, get, 'project-1');
  Object.assign(state, slice);
  return {get, slice};
}

describe('createCalibrationKeyConfigSlice', () => {
  it('starts with no available calibration keys', () => {
    const {slice} = makeHarness();
    expect(slice.calibrationKeys).toEqual({});
  });

  it('resetCalibrationKeyConfiguration clears calibrationKeys', () => {
    const {get, slice} = makeHarness();
    slice.resetCalibrationKeyConfiguration();
    expect(get().calibrationKeys).toEqual({});
  });

  it('updateConfiguredCkvs writes through updateModuleCkvsLocal', () => {
    const {get, slice} = makeHarness();
    slice.updateConfiguredCkvs('mod-1', []);
    expect(get().updateModuleCkvsLocal).toHaveBeenCalledWith('mod-1', []);
  });

  it('updateConfiguredCkvs preserves existing parameter info by default', () => {
    const graphKey = {id: 1, name: 'Device', systemId: 'key-1', values: []};
    const realParam = {
      description: 'Gain control',
      name: 'Gain',
      naturalId: 100,
      systemId: 'p-100',
    };
    const {get, slice} = makeHarness({
      calibrationKeys: {Device: graphKey},
      graphData: {
        moduleInstances: {
          'mod-1': {
            ckvs: [
              {
                keyValuePairs: [
                  {
                    key: {name: 'Device', naturalId: 1, systemId: 'key-1'},
                    value: {name: 'Speaker', naturalId: 10, systemId: 'val-10'},
                  },
                ],
                supportedParameters: [realParam],
                systemId: 'ckv-1',
              },
            ],
            systemId: 'mod-1',
          },
        },
      },
    });

    slice.updateConfiguredCkvs('mod-1', [
      {
        keyValuePairs: [
          {key: graphKey, value: {id: 10, name: 'Speaker', systemId: 'val-10'}},
        ],
        pidConfig: [100],
        systemId: 'ckv-1',
      },
    ]);

    expect(get().updateModuleCkvsLocal).toHaveBeenCalledWith('mod-1', [
      expect.objectContaining({supportedParameters: [realParam]}),
    ]);
  });

  it('updateConfiguredCkvs uses an explicit paramInfoByNaturalId over the default', () => {
    const graphKey = {id: 1, name: 'Device', systemId: 'key-1', values: []};
    const staleParam = {
      description: 'stale',
      name: 'stale-name',
      naturalId: 100,
      systemId: 'p-100',
    };
    const freshParam = {
      description: 'Gain control',
      name: 'Gain',
      naturalId: 100,
      systemId: 'p-100',
    };
    const {get, slice} = makeHarness({
      calibrationKeys: {Device: graphKey},
      graphData: {
        moduleInstances: {
          'mod-1': {
            ckvs: [
              {
                keyValuePairs: [],
                supportedParameters: [staleParam],
                systemId: 'ckv-1',
              },
            ],
            systemId: 'mod-1',
          },
        },
      },
    });

    slice.updateConfiguredCkvs(
      'mod-1',
      [{keyValuePairs: [], pidConfig: [100], systemId: 'ckv-1'}],
      {100: freshParam},
    );

    expect(get().updateModuleCkvsLocal).toHaveBeenCalledWith('mod-1', [
      expect.objectContaining({supportedParameters: [freshParam]}),
    ]);
  });
});
