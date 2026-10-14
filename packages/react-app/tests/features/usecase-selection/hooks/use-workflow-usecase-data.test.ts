/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {renderHook, waitFor} from '@testing-library/react';

const mockGetAllUsecases = jest.fn();
const mockGetUsecasesFilteredBySubsystem = jest.fn();
const mockMapSubsystemResultsToCategories = jest.fn();
const mockMapUsecaseDtoToCategories = jest.fn();

jest.mock('~entities/usecases/api/usecases-api', () => ({
  getAllUsecases: (...args: unknown[]) => mockGetAllUsecases(...args),
  getUsecasesFilteredBySubsystem: (...args: unknown[]) =>
    mockGetUsecasesFilteredBySubsystem(...args),
}));

jest.mock('~entities/usecases/model/usecase.mapper', () => ({
  mapSubsystemResultsToCategories: (...args: unknown[]) =>
    mockMapSubsystemResultsToCategories(...args),
  mapUsecaseDtoToCategories: (...args: unknown[]) =>
    mockMapUsecaseDtoToCategories(...args),
}));

jest.mock('~shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
}));

import {useWorkflowUsecaseData} from '~features/usecase-selection/hooks/use-workflow-usecase-data';
import type {
  WorkflowLevel,
  WorkflowType,
} from '~shared/config/user-preferences-types';

const PROJECT_ID = 'project-1';

const ITEM_SPEAKER = {
  expanded: false,
  keyValuePairs: [],
  name: 'Speaker_Mic',
  systemId: 'UC_001',
};

const ITEM_HFP = {
  expanded: false,
  keyValuePairs: [],
  name: 'HFP_Rx_Playback',
  systemId: 'UC_002',
};

const BASE_DATA = [
  {expanded: true, items: [ITEM_SPEAKER, ITEM_HFP], name: 'Default'},
];

const SUBSYSTEM_CATEGORIES = [
  {
    expanded: true,
    items: [
      {
        children: [ITEM_SPEAKER],
        expanded: true,
        keyValuePairs: [],
        name: 'StreamPP_RX',
      },
    ],
    name: 'Subsystem Filtered Usecases',
  },
];

const BASE_API_RESPONSE = [{keyValuePairs: [], systemId: 'UC_001'}];

const SUBSYSTEM_API_RESPONSE = [
  {
    filteredKv: {
      keyValuePairs: [],
      subsystems: [{name: 'StreamPP_RX', subsystemNaturalId: 100}],
    },
    usecases: [{...ITEM_SPEAKER}],
  },
];

beforeEach(() => {
  mockGetAllUsecases.mockResolvedValue({
    data: BASE_API_RESPONSE,
    success: true,
  });
  mockGetUsecasesFilteredBySubsystem.mockResolvedValue({
    data: SUBSYSTEM_API_RESPONSE,
    success: true,
  });
  mockMapSubsystemResultsToCategories.mockReturnValue(SUBSYSTEM_CATEGORIES);
  mockMapUsecaseDtoToCategories.mockReturnValue(BASE_DATA);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useWorkflowUsecaseData', () => {
  it('fetches and maps the base list for usecase-level workflow', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(PROJECT_ID, 'usecase-workflow', 'usecase-level'),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetAllUsecases).toHaveBeenCalledWith(PROJECT_ID);
    expect(mockMapUsecaseDtoToCategories).toHaveBeenCalledWith(
      BASE_API_RESPONSE,
    );
    expect(mockGetUsecasesFilteredBySubsystem).not.toHaveBeenCalled();
    expect(result.current.resolvedData).toEqual(BASE_DATA);
  });

  it('combines valid subsystem groups with the base list for system workflow', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(PROJECT_ID, 'system-workflow', 'usecase-level'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetUsecasesFilteredBySubsystem).toHaveBeenCalledWith(PROJECT_ID);
    expect(result.current.resolvedData).toEqual([
      ...BASE_DATA,
      ...SUBSYSTEM_CATEGORIES,
    ]);
  });

  it('keeps usecases from empty subsystem groups in Default', async () => {
    const emptySubsystemResult = {
      filteredKv: {
        keyValuePairs: [],
        subsystems: [],
      },
      usecases: [{...ITEM_HFP}],
    };
    mockGetUsecasesFilteredBySubsystem.mockResolvedValue({
      data: [SUBSYSTEM_API_RESPONSE[0], emptySubsystemResult],
      success: true,
    });

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(PROJECT_ID, 'usecase-workflow', 'subsystem-level'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockMapSubsystemResultsToCategories).toHaveBeenCalledWith(
      SUBSYSTEM_API_RESPONSE,
    );
    const defaultCategory = result.current.resolvedData.find(
      (category) => category.name === 'Default',
    );
    expect(defaultCategory?.items).toContainEqual(ITEM_HFP);
    expect(defaultCategory?.items).not.toContainEqual(ITEM_SPEAKER);
  });

  it('falls back to the base list when the subsystem request fails', async () => {
    mockGetUsecasesFilteredBySubsystem.mockResolvedValue({
      message: 'Server error',
      success: false,
    });

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(PROJECT_ID, 'usecase-workflow', 'subsystem-level'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.resolvedData).toBe(BASE_DATA);
  });

  it('recomputes without refetching the base list when workflow preferences change', async () => {
    const {rerender, result} = renderHook(
      ({level, type}: {level: WorkflowLevel; type: WorkflowType}) =>
        useWorkflowUsecaseData(PROJECT_ID, type, level),
      {
        initialProps: {
          level: 'usecase-level' as WorkflowLevel,
          type: 'usecase-workflow' as WorkflowType,
        },
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({level: 'subsystem-level', type: 'usecase-workflow'});

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetAllUsecases).toHaveBeenCalledTimes(1);
    expect(mockGetUsecasesFilteredBySubsystem).toHaveBeenCalledTimes(1);

    rerender({level: 'usecase-level', type: 'usecase-workflow'});

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetAllUsecases).toHaveBeenCalledTimes(1);
    expect(mockGetUsecasesFilteredBySubsystem).toHaveBeenCalledTimes(1);
    expect(result.current.resolvedData).toEqual(BASE_DATA);
    expect(result.current.resolvedData).not.toBe(BASE_DATA);
  });

  it('publishes a fresh base result when switching back to usecase-level', async () => {
    mockGetUsecasesFilteredBySubsystem.mockResolvedValue({
      message: 'Server error',
      success: false,
    });

    const {rerender, result} = renderHook(
      ({level}: {level: WorkflowLevel}) =>
        useWorkflowUsecaseData(PROJECT_ID, 'usecase-workflow', level),
      {
        initialProps: {level: 'subsystem-level' as WorkflowLevel},
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const fallbackData = result.current.resolvedData;
    expect(fallbackData).toBe(BASE_DATA);

    rerender({level: 'usecase-level'});

    await waitFor(() => {
      expect(result.current.resolvedData).not.toBe(fallbackData);
    });

    expect(result.current.resolvedData).toEqual(BASE_DATA);
  });

  it('returns an empty list when the base request fails', async () => {
    mockGetAllUsecases.mockResolvedValue({
      message: 'Server error',
      success: false,
    });

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(PROJECT_ID, 'usecase-workflow', 'usecase-level'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.resolvedData).toEqual([]);
    expect(mockGetUsecasesFilteredBySubsystem).not.toHaveBeenCalled();
  });
});
