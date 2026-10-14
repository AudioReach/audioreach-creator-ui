/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {
  getAllUsecases,
  getUsecasesFilteredBySubsystem,
  mapSubsystemResultsToCategories,
  mapUsecaseDtoToCategories,
  type UsecaseCategory,
} from '~entities/usecases';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {
  WORKFLOW_LEVELS,
  WORKFLOW_TYPES,
  type WorkflowLevel,
  type WorkflowType,
} from '~shared/config/user-preferences-types';
import {logger} from '~shared/lib/logger';

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
): {isLoading: boolean; resolvedData: UsecaseCategory[]} {
  const [baseProjectId, setBaseProjectId] = useState<string | null>(null);
  const [baseUsecaseData, setBaseUsecaseData] = useState<
    UsecaseCategory[] | null
  >(null);
  const [isBaseLoading, setIsBaseLoading] = useState(true);
  const [isSubsystemLoading, setIsSubsystemLoading] = useState(false);
  const [resolvedData, setResolvedData] = useState<UsecaseCategory[]>([]);

  useEffect(() => {
    let cancelled = false;

    setBaseProjectId(null);
    setBaseUsecaseData(null);
    setIsBaseLoading(true);
    setIsSubsystemLoading(false);
    setResolvedData([]);

    getAllUsecases(projectGroupId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!hasBlockingIssues(result) && result.data) {
          setBaseUsecaseData(mapUsecaseDtoToCategories(result.data));
          return;
        }

        logger.error('Failed to fetch usecase data', {
          action: 'fetch_usecase_data',
          component: 'useWorkflowUsecaseData',
          error: getIssueMessage(result, 'Failed to fetch usecase data'),
          projectId: projectGroupId,
        });
        setBaseUsecaseData([]);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        logger.error('Error fetching usecase data', {
          action: 'fetch_usecase_data',
          component: 'useWorkflowUsecaseData',
          error: err instanceof Error ? err.message : String(err),
          projectId: projectGroupId,
        });
        setBaseUsecaseData([]);
      })
      .finally(() => {
        if (!cancelled) {
          setBaseProjectId(projectGroupId);
          setIsBaseLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectGroupId]);

  useEffect(() => {
    if (baseProjectId !== projectGroupId || baseUsecaseData === null) {
      return undefined;
    }

    let cancelled = false;

    if (
      workflowType === WORKFLOW_TYPES.USECASE &&
      workflowLevel === WORKFLOW_LEVELS.USECASE
    ) {
      setIsSubsystemLoading(false);
      setResolvedData([...baseUsecaseData]);
      return undefined;
    }

    const isSystemWorkflow = workflowType === WORKFLOW_TYPES.SYSTEM;

    setIsSubsystemLoading(true);
    getUsecasesFilteredBySubsystem(projectGroupId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!hasBlockingIssues(result) && result.data) {
          const subsystemResults = result.data.filter(
            (dto) => dto.filteredKv.subsystems.length > 0,
          );
          const subsystemCategories =
            subsystemResults.length > 0
              ? mapSubsystemResultsToCategories(subsystemResults)
              : [];

          if (isSystemWorkflow) {
            setResolvedData([...baseUsecaseData, ...subsystemCategories]);
            return;
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
                (item) =>
                  !item.systemId || !subsystemUsecaseIds.has(item.systemId),
              ),
            }))
            .filter((category) => category.items.length > 0);

          setResolvedData([...filteredBaseData, ...subsystemCategories]);
          return;
        }

        logger.error('Failed to fetch subsystem data', {
          action: 'fetch_subsystem_data',
          component: 'useWorkflowUsecaseData',
          error: getIssueMessage(result, 'Failed to fetch subsystem data'),
          projectId: projectGroupId,
        });
        setResolvedData(baseUsecaseData);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        logger.error('Error fetching subsystem data', {
          action: 'fetch_subsystem_data',
          component: 'useWorkflowUsecaseData',
          error: err instanceof Error ? err.message : String(err),
          projectId: projectGroupId,
        });
        setResolvedData(baseUsecaseData);
      })
      .finally(() => {
        if (!cancelled) {
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
  ]);

  return {
    isLoading: isBaseLoading || isSubsystemLoading,
    resolvedData,
  };
}
