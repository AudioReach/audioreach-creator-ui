/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useState} from 'react';

import {
  getAllUsecases,
  getUsecasesFilteredBySubsystem,
  mapSubsystemResultsToCategories,
  mapUsecaseDtoToCategories,
  type UsecaseCategory,
  type UsecaseNamePreference,
} from '~entities/usecases';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {useUserPreferences} from '~shared/config/hooks';
import {
  WORKFLOW_LEVELS,
  WORKFLOW_TYPES,
  type WorkflowLevel,
  type WorkflowType,
} from '~shared/config/user-preferences-types';
import {logger} from '~shared/lib/logger';

async function fetchBaseUsecaseData(
  projectGroupId: string,
  namePreference: UsecaseNamePreference,
): Promise<UsecaseCategory[]> {
  try {
    const result = await getAllUsecases(projectGroupId);

    if (!hasBlockingIssues(result) && result.data) {
      return mapUsecaseDtoToCategories(result.data, namePreference);
    }

    logger.error('Failed to fetch usecase data', {
      action: 'fetch_usecase_data',
      component: 'useWorkflowUsecaseData',
      error: getIssueMessage(result, 'Failed to fetch usecase data'),
      projectId: projectGroupId,
    });
    return [];
  } catch (err) {
    logger.error('Error fetching usecase data', {
      action: 'fetch_usecase_data',
      component: 'useWorkflowUsecaseData',
      error: err instanceof Error ? err.message : String(err),
      projectId: projectGroupId,
    });
    return [];
  }
}

async function resolveWorkflowData(
  baseUsecaseData: UsecaseCategory[],
  projectGroupId: string,
  workflowLevel: WorkflowLevel,
  workflowType: WorkflowType,
  namePreference: UsecaseNamePreference,
): Promise<UsecaseCategory[]> {
  if (
    workflowType === WORKFLOW_TYPES.USECASE &&
    workflowLevel === WORKFLOW_LEVELS.USECASE
  ) {
    return [...baseUsecaseData];
  }

  try {
    const result = await getUsecasesFilteredBySubsystem(projectGroupId);
    if (!hasBlockingIssues(result) && result.data) {
      const subsystemResults = result.data.filter(
        (dto) => dto.filteredKv.subsystems.length > 0,
      );
      const subsystemCategories =
        subsystemResults.length > 0
          ? mapSubsystemResultsToCategories(subsystemResults, namePreference)
          : [];

      if (workflowType === WORKFLOW_TYPES.SYSTEM) {
        return [...baseUsecaseData, ...subsystemCategories];
      }

      const subsystemUsecaseIds = new Set(
        subsystemResults.flatMap((dto) =>
          dto.usecases.map((usecase) => usecase.systemId),
        ),
      );
      const filteredBaseData = baseUsecaseData
        .map((category) => ({
          ...category,
          items: category.items.filter(
            (item) => !item.systemId || !subsystemUsecaseIds.has(item.systemId),
          ),
        }))
        .filter((category) => category.items.length > 0);

      return [...filteredBaseData, ...subsystemCategories];
    }

    logger.error('Failed to fetch subsystem data', {
      action: 'fetch_subsystem_data',
      component: 'useWorkflowUsecaseData',
      error: getIssueMessage(result, 'Failed to fetch subsystem data'),
      projectId: projectGroupId,
    });
    return baseUsecaseData;
  } catch (err) {
    logger.error('Error fetching subsystem data', {
      action: 'fetch_subsystem_data',
      component: 'useWorkflowUsecaseData',
      error: err instanceof Error ? err.message : String(err),
      projectId: projectGroupId,
    });
    return baseUsecaseData;
  }
}

/**
 * Resolves usecase selection data for the active workflow preference.
 * @param projectGroupId - Project identifier used for API calls
 * @param workflowType - Active workflow type
 * @param workflowLevel - Active workflow level
 */
export function useWorkflowUsecaseData(
  projectGroupId: string,
  workflowType: WorkflowType,
  workflowLevel: WorkflowLevel,
): {
  isLoading: boolean;
  refresh: () => Promise<UsecaseCategory[]>;
  resolvedData: UsecaseCategory[];
} {
  const {preferences} = useUserPreferences();
  const namePreference = preferences.usecases.namePreference;
  const [baseProjectId, setBaseProjectId] = useState<string | null>(null);
  const [baseUsecaseData, setBaseUsecaseData] = useState<
    UsecaseCategory[] | null
  >(null);
  const [isBaseLoading, setIsBaseLoading] = useState(true);
  const [isSubsystemLoading, setIsSubsystemLoading] = useState(false);
  const [resolvedData, setResolvedData] = useState<UsecaseCategory[]>([]);

  const refresh = useCallback(async (): Promise<UsecaseCategory[]> => {
    setIsBaseLoading(true);
    setIsSubsystemLoading(false);
    const nextBaseData = await fetchBaseUsecaseData(
      projectGroupId,
      namePreference,
    );
    setBaseProjectId(projectGroupId);
    setBaseUsecaseData(nextBaseData);
    setIsBaseLoading(false);

    const needsSubsystemData =
      workflowType !== WORKFLOW_TYPES.USECASE ||
      workflowLevel !== WORKFLOW_LEVELS.USECASE;
    setIsSubsystemLoading(needsSubsystemData);
    const nextData = await resolveWorkflowData(
      nextBaseData,
      projectGroupId,
      workflowLevel,
      workflowType,
      namePreference,
    );
    setResolvedData(nextData);
    setIsSubsystemLoading(false);
    return nextData;
  }, [projectGroupId, workflowLevel, workflowType, namePreference]);

  useEffect(() => {
    let cancelled = false;

    setBaseProjectId(null);
    setBaseUsecaseData(null);
    setIsBaseLoading(true);
    setIsSubsystemLoading(false);
    setResolvedData([]);

    void fetchBaseUsecaseData(projectGroupId, namePreference).then(
      (nextBaseData) => {
        if (!cancelled) {
          setBaseProjectId(projectGroupId);
          setBaseUsecaseData(nextBaseData);
          setIsBaseLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [projectGroupId, namePreference]);

  useEffect(() => {
    if (baseProjectId !== projectGroupId || baseUsecaseData === null) {
      return undefined;
    }

    let cancelled = false;
    const needsSubsystemData =
      workflowType !== WORKFLOW_TYPES.USECASE ||
      workflowLevel !== WORKFLOW_LEVELS.USECASE;

    if (!needsSubsystemData) {
      setIsSubsystemLoading(false);
      setResolvedData([...baseUsecaseData]);
      return undefined;
    }

    setIsSubsystemLoading(true);

    void resolveWorkflowData(
      baseUsecaseData,
      projectGroupId,
      workflowLevel,
      workflowType,
      namePreference,
    ).then((nextData) => {
      if (!cancelled) {
        setResolvedData(nextData);
        setIsSubsystemLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    baseProjectId,
    baseUsecaseData,
    projectGroupId,
    workflowLevel,
    workflowType,
    namePreference,
  ]);

  return {
    isLoading: isBaseLoading || isSubsystemLoading,
    refresh,
    resolvedData,
  };
}
