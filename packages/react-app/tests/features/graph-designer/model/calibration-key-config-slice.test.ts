import {createCalibrationKeyConfigSlice} from '~features/graph-designer/model/calibration-key-config-slice';

jest.mock('~entities/key-definitions', () => ({
  getAllKeyDefinitions: jest.fn(),
}));
jest.mock('~shared/lib/logger', () => ({
  logger: {error: jest.fn(), info: jest.fn(), warn: jest.fn()},
}));

function makeHarness() {
  let state: Record<string, unknown> = {
    graphData: {moduleInstances: {'mod-1': {ckvs: [], systemId: 'mod-1'}}},
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
  const slice = createCalibrationKeyConfigSlice(set, get);
  Object.assign(state, slice);
  return {get, slice};
}

describe('createCalibrationKeyConfigSlice', () => {
  it('starts with no available calibration keys', () => {
    const {slice} = makeHarness();
    expect(slice.availableCalibrationKeys).toEqual({});
  });

  it('resetCalibrationKeyConfiguration clears availableCalibrationKeys', () => {
    const {get, slice} = makeHarness();
    slice.resetCalibrationKeyConfiguration();
    expect(get().availableCalibrationKeys).toEqual({});
  });

  it('updateConfiguredCkvs writes through updateModuleCkvsLocal', () => {
    const {get, slice} = makeHarness();
    slice.updateConfiguredCkvs('mod-1', []);
    expect(get().updateModuleCkvsLocal).toHaveBeenCalledWith('mod-1', []);
  });
});
