/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {renderHook, waitFor} from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUsecasesFilteredBySubsystem = jest.fn();
const mockMapSubsystemResultsToCategories = jest.fn();

jest.mock('~entities/usecases/api/usecases-api', () => ({
  getUsecasesFilteredBySubsystem: (...args: any[]) =>
    mockGetUsecasesFilteredBySubsystem(...args),
}));

jest.mock('~entities/usecases/model/usecase.mapper', () => ({
  mapSubsystemResultsToCategories: (...args: any[]) =>
    mockMapSubsystemResultsToCategories(...args),
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

// ── Test data ─────────────────────────────────────────────────────────────────

const PROJECT_ID = 'project-1';

const ITEM_SPEAKER: any = {
  expanded: false,
  keyValuePairs: [],
  name: 'Speaker_Mic',
  systemId: 'UC_001',
};

const ITEM_HFP: any = {
  expanded: false,
  keyValuePairs: [],
  name: 'HFP_Rx_Playback',
  systemId: 'UC_002',
};

const BASE_DATA: any[] = [
  {expanded: true, items: [ITEM_SPEAKER, ITEM_HFP], name: 'Default'},
];

const SUBSYSTEM_CATEGORIES: any[] = [
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

// Raw API response for subsystem endpoint
const SUBSYSTEM_API_RESPONSE = [
  {
    filteredKv: {keyValuePairs: []},
    usecases: [{...ITEM_SPEAKER}], // UC_001 is in the subsystem
  },
];

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockMapSubsystemResultsToCategories.mockReturnValue(SUBSYSTEM_CATEGORIES);
  mockGetUsecasesFilteredBySubsystem.mockResolvedValue({
    data: SUBSYSTEM_API_RESPONSE,
    success: true,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWorkflowUsecaseData — Case 1: usecase-level', () => {
  const workflowType: WorkflowType = 'usecase-workflow';
  const workflowLevel: WorkflowLevel = 'usecase-level';

  it('returns baseUsecaseData unchanged', () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    expect(result.current.resolvedData).toBe(BASE_DATA);
  });

  it('does not call the subsystem API', () => {
    renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    expect(mockGetUsecasesFilteredBySubsystem).not.toHaveBeenCalled();
  });

  it('isLoading is false', () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useWorkflowUsecaseData — Case 2: subsystem-level', () => {
  const workflowType: WorkflowType = 'usecase-workflow';
  const workflowLevel: WorkflowLevel = 'subsystem-level';

  it('calls the subsystem API with the correct projectGroupId', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetUsecasesFilteredBySubsystem).toHaveBeenCalledWith(PROJECT_ID);
  });

  it('removes usecases that appear in subsystem groups from base data', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // UC_001 (Speaker_Mic) is in the subsystem response, so it should be
    // removed from the base "Default" category to avoid duplicates.
    const defaultCat = result.current.resolvedData.find(
      (c) => c.name === 'Default',
    );
    expect(defaultCat?.items).not.toContainEqual(
      expect.objectContaining({systemId: 'UC_001'}),
    );
    // UC_002 (HFP_Rx_Playback) is NOT in the subsystem, so it stays.
    expect(defaultCat?.items).toContainEqual(
      expect.objectContaining({systemId: 'UC_002'}),
    );
  });

  it('appends subsystem categories to the filtered base data', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const subsystemCat = result.current.resolvedData.find(
      (c) => c.name === 'Subsystem Filtered Usecases',
    );
    expect(subsystemCat).toBeDefined();
  });

  it('drops base categories that become empty after deduplication', async () => {
    // All items in base data are in the subsystem
    const allInSubsystem: any[] = [
      {expanded: true, items: [ITEM_SPEAKER], name: 'Default'},
    ];

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        allInSubsystem,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // "Default" category should be dropped (all items removed)
    const defaultCat = result.current.resolvedData.find(
      (c) => c.name === 'Default',
    );
    expect(defaultCat).toBeUndefined();
  });

  it('isLoading transitions from true to false', async () => {
    let resolveApi!: (value: any) => void;
    mockGetUsecasesFilteredBySubsystem.mockReturnValue(
      new Promise((resolve) => {
        resolveApi = resolve;
      }),
    );

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    // Should be loading while API is in flight
    expect(result.current.isLoading).toBe(true);

    resolveApi({data: SUBSYSTEM_API_RESPONSE, success: true});

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe('useWorkflowUsecaseData — Case 3: system-workflow', () => {
  const workflowType: WorkflowType = 'system-workflow';
  const workflowLevel: WorkflowLevel = 'usecase-level';

  it('calls the subsystem API', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetUsecasesFilteredBySubsystem).toHaveBeenCalledWith(PROJECT_ID);
  });

  it('combines base data AND subsystem categories without deduplication', async () => {
    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        workflowType,
        workflowLevel,
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Both the original "Default" category AND the subsystem category are present
    const names = result.current.resolvedData.map((c) => c.name);
    expect(names).toContain('Default');
    expect(names).toContain('Subsystem Filtered Usecases');

    // UC_001 is NOT removed from base data in System Workflow
    const defaultCat = result.current.resolvedData.find(
      (c) => c.name === 'Default',
    );
    expect(defaultCat?.items).toContainEqual(
      expect.objectContaining({systemId: 'UC_001'}),
    );
  });
});

describe('useWorkflowUsecaseData — error handling', () => {
  it('falls back to baseUsecaseData when API returns success=false', async () => {
    mockGetUsecasesFilteredBySubsystem.mockResolvedValue({
      message: 'Server error',
      success: false,
    });

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        'usecase-workflow',
        'subsystem-level',
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.resolvedData).toBe(BASE_DATA);
  });

  it('falls back to baseUsecaseData when API throws', async () => {
    mockGetUsecasesFilteredBySubsystem.mockRejectedValue(
      new Error('Network error'),
    );

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        'usecase-workflow',
        'subsystem-level',
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.resolvedData).toBe(BASE_DATA);
  });

  it('isLoading is false after an API error', async () => {
    mockGetUsecasesFilteredBySubsystem.mockRejectedValue(
      new Error('Network error'),
    );

    const {result} = renderHook(() =>
      useWorkflowUsecaseData(
        PROJECT_ID,
        'system-workflow',
        'usecase-level',
        BASE_DATA,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe('useWorkflowUsecaseData — workflow changes', () => {
  it('re-fetches when workflowLevel changes from usecase-level to subsystem-level', async () => {
    const {rerender, result} = renderHook(
      ({level, type}: {level: WorkflowLevel; type: WorkflowType}) =>
        useWorkflowUsecaseData(PROJECT_ID, type, level, BASE_DATA),
      {
        initialProps: {
          level: 'usecase-level' as WorkflowLevel,
          type: 'usecase-workflow' as WorkflowType,
        },
      },
    );

    expect(mockGetUsecasesFilteredBySubsystem).not.toHaveBeenCalled();

    rerender({level: 'subsystem-level', type: 'usecase-workflow'});

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetUsecasesFilteredBySubsystem).toHaveBeenCalledTimes(1);
  });

  it('returns baseUsecaseData immediately when switching back to usecase-level', async () => {
    const {rerender, result} = renderHook(
      ({level, type}: {level: WorkflowLevel; type: WorkflowType}) =>
        useWorkflowUsecaseData(PROJECT_ID, type, level, BASE_DATA),
      {
        initialProps: {
          level: 'subsystem-level' as WorkflowLevel,
          type: 'usecase-workflow' as WorkflowType,
        },
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({level: 'usecase-level', type: 'usecase-workflow'});

    // Immediately returns base data, no loading
    expect(result.current.resolvedData).toBe(BASE_DATA);
    expect(result.current.isLoading).toBe(false);
  });
});
