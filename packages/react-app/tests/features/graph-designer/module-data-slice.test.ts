/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockGetCalData = jest.fn();
const mockPutCalData = jest.fn();
const mockGetTagData = jest.fn();
const mockPutTagData = jest.fn();
const mockQueryModuleIndices = jest.fn();

jest.mock('~entities/spf-module-data', () => ({
  getCalData: (...args: unknown[]) => mockGetCalData(...args),
  getTagData: (...args: unknown[]) => mockGetTagData(...args),
  putCalData: (...args: unknown[]) => mockPutCalData(...args),
  putTagData: (...args: unknown[]) => mockPutTagData(...args),
  queryModuleIndices: (...args: unknown[]) => mockQueryModuleIndices(...args),
}));

const mockShowToast = jest.fn();
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

import {createStore} from 'zustand';

import type {
  CalDataDto,
  CkvDto,
  ParameterDetailDto,
  SpfModuleDto,
  TagDataDto,
  TagInfoDto,
} from '~entities/spf-module-data';
import {
  createModuleDataSlice,
  type ModuleDataSlice,
} from '~features/graph-designer/model/module-data-slice';

const PROJECT_ID = 'proj-1';
const MODULE_ID = 'mod-1';
const MODULE_NAME = 'AudioDecoder';

function makeStore() {
  return createStore<ModuleDataSlice>((set, get) =>
    createModuleDataSlice(set, get, PROJECT_ID),
  );
}

function makeCalDataDto(overrides?: Partial<CalDataDto>): CalDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    Ckv: [],
    parameters: [],
    systemId: 'ckv-1',
    ...overrides,
  };
}

function makeTagDataDto(overrides?: Partial<TagDataDto>): TagDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    parameters: [],
    systemId: 'tkv-1',
    Tkv: [],
    ...overrides,
  };
}

function makeCkvDto(systemId: string): CkvDto {
  return {keyValueCollection: [], supportedParameters: [], systemId};
}

function makeTagInfoDto(systemId: string, tkvSystemIds: string[]): TagInfoDto {
  return {
    systemId,
    tagId: 1,
    tagName: 'tag',
    tkvs: tkvSystemIds.map((tkvSystemId) => ({
      keyValueCollection: [],
      supportedParameters: [],
      systemId: tkvSystemId,
    })),
  };
}

function makeParam(
  parameterId: string,
  overrides?: Partial<ParameterDetailDto>,
): ParameterDetailDto {
  return {
    changeInfo: {changeType: 'NONE'},
    elements: [],
    name: parameterId,
    parameterId,
    systemId: parameterId,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createModuleDataSlice — queryModuleData', () => {
  it('populates cal and tag indices and fetches the first of each on success', async () => {
    const module: SpfModuleDto = {
      changeInfo: {changeType: 'NONE'},
      ckvs: [makeCkvDto('ckv-1')],
      id: 1,
      systemId: MODULE_ID,
      tags: [makeTagInfoDto('tag-1', ['tkv-1'])],
    };
    mockQueryModuleIndices.mockResolvedValueOnce({
      data: [module],
      message: undefined,
      success: true,
    });
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    const result = await store
      .getState()
      .queryModuleData(MODULE_ID, MODULE_NAME);

    expect(result).toBe(true);
    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.calData?.availableCalIndices).toHaveLength(1);
    expect(entry.tagData?.availableTagIndices).toHaveLength(1);
    expect(mockGetCalData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-1',
      undefined,
    );
    expect(mockGetTagData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'tag-1',
      'tkv-1',
    );
  });

  it('toasts and returns false when the API call fails', async () => {
    mockQueryModuleIndices.mockResolvedValueOnce({
      data: undefined,
      message: 'boom',
      success: false,
    });

    const store = makeStore();
    const result = await store
      .getState()
      .queryModuleData(MODULE_ID, MODULE_NAME);

    expect(result).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'danger');
    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.calData?.status).toBe('error');
    expect(entry.tagData?.status).toBe('error');
  });
});

describe('createModuleDataSlice — fetchCalData', () => {
  it('sets loadedScope to full on a full fetch', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');

    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('full');
    expect(entry.calData?.status).toBe('ready');
    expect(entry.calData?.lastMutation).toBe('get');
  });

  it('sets loadedScope to partial on a partial fetch', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store
      .getState()
      .fetchCalData(MODULE_ID, 'ckv-1', 'partial', ['param-1']);

    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.calData?.loadedScope).toBe('partial');
    expect(mockGetCalData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'ckv-1',
      ['param-1'],
    );
  });
});

describe('createModuleDataSlice — setCalUiState / setGroupedCalUiState / setTagUiState', () => {
  it('merges a uiState patch into an existing calData entry', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    store.getState().setCalUiState(MODULE_ID, {searchText: 'gain'});

    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.calData?.uiState?.searchText).toBe('gain');
  });

  it('is a no-op when no calData entry exists yet', () => {
    const store = makeStore();
    store.getState().setCalUiState(MODULE_ID, {searchText: 'gain'});

    expect(store.getState().moduleDataByModuleId[MODULE_ID]).toBeUndefined();
  });
});

describe('createModuleDataSlice — setModuleOpenTab', () => {
  it('does not call clearModuleData when switching tabs', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    store.getState().setModuleOpenTab(MODULE_ID, 'cal-tab');

    expect(store.getState().moduleOpenTabs[MODULE_ID]).toBe('cal-tab');
    expect(store.getState().moduleDataByModuleId[MODULE_ID]).toBeDefined();
  });
});

describe('createModuleDataSlice — updateCalData', () => {
  it('replaces only the returned parameters by id, preserving the rest, and flags lastMutation as set', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto({
        parameters: [makeParam('param-1'), makeParam('param-2')],
      }),
      message: undefined,
      success: true,
    });
    mockPutCalData.mockResolvedValueOnce({
      data: makeCalDataDto({
        parameters: [
          makeParam('param-1', {
            elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
          }),
        ],
      }),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    await store.getState().updateCalData(MODULE_ID, {data: []});

    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.calData?.dto?.parameters).toEqual([
      makeParam('param-1', {
        elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
      }),
      makeParam('param-2'),
    ]);
    expect(entry.calData?.lastMutation).toBe('set');
  });

  it('toasts and returns void when no calData is loaded', async () => {
    const store = makeStore();
    const result = await store.getState().updateCalData(MODULE_ID, {data: []});

    expect(result).toBeUndefined();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'danger');
    expect(mockPutCalData).not.toHaveBeenCalled();
  });
});

describe('createModuleDataSlice — updateTagData', () => {
  it('resolves tagSystemId from the entry directly, not by searching availableTagIndices', async () => {
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto(),
      message: undefined,
      success: true,
    });
    mockPutTagData.mockResolvedValueOnce({
      data: makeTagDataDto({systemId: 'tkv-1-updated'}),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchTagData(MODULE_ID, 'tag-1', 'tkv-1');
    await store.getState().updateTagData(MODULE_ID, {data: []});

    expect(mockPutTagData).toHaveBeenCalledWith(
      PROJECT_ID,
      MODULE_ID,
      'tag-1',
      'tkv-1',
      {data: []},
    );
  });

  it('replaces only the returned parameters by id, preserving the rest, and flags lastMutation as set', async () => {
    mockGetTagData.mockResolvedValueOnce({
      data: makeTagDataDto({
        parameters: [makeParam('param-1'), makeParam('param-2')],
      }),
      message: undefined,
      success: true,
    });
    mockPutTagData.mockResolvedValueOnce({
      data: makeTagDataDto({
        parameters: [
          makeParam('param-2', {
            elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
          }),
        ],
      }),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchTagData(MODULE_ID, 'tag-1', 'tkv-1');
    await store.getState().updateTagData(MODULE_ID, {data: []});

    const entry = store.getState().moduleDataByModuleId[MODULE_ID];
    expect(entry.tagData?.dto?.parameters).toEqual([
      makeParam('param-1'),
      makeParam('param-2', {
        elements: [{type: 'NAME_VALUE_PAIR', value: 'updated'}],
      }),
    ]);
    expect(entry.tagData?.lastMutation).toBe('set');
  });

  it('toasts and returns void when no tagData is loaded', async () => {
    const store = makeStore();
    const result = await store.getState().updateTagData(MODULE_ID, {data: []});

    expect(result).toBeUndefined();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'danger');
    expect(mockPutTagData).not.toHaveBeenCalled();
  });
});

describe('createModuleDataSlice — clearModuleData', () => {
  it('removes the entry for the given moduleId', async () => {
    mockGetCalData.mockResolvedValueOnce({
      data: makeCalDataDto(),
      message: undefined,
      success: true,
    });

    const store = makeStore();
    await store.getState().fetchCalData(MODULE_ID, 'ckv-1');
    store.getState().clearModuleData(MODULE_ID);

    expect(store.getState().moduleDataByModuleId[MODULE_ID]).toBeUndefined();
  });
});
