/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {
  getUsecasesFilteredBySubsystem,
  mapSubsystemResultsToCategories,
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
 * @param projectGroupId  - Project identifier (used for API calls)
 * @param workflowType    - Active workflow type from UsecasePreferences
 * @param workflowLevel   - Active workflow level from UsecasePreferences
 * @param baseUsecaseData - Full usecase list fetched at project open time
 */
export function useWorkflowUsecaseData(
  projectGroupId: string,
  workflowType: WorkflowType,
  workflowLevel: WorkflowLevel,
  baseUsecaseData: UsecaseCategory[],
): {isLoading: boolean; resolvedData: UsecaseCategory[]} {
  const [resolvedData, setResolvedData] =
    useState<UsecaseCategory[]>(baseUsecaseData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Stale-update guard — prevents state updates after the effect is cleaned up
    let cancelled = false;

    // ── Case 1: Usecase Workflow / Usecase Level ──────────────────────────────
    if (
      workflowType === WORKFLOW_TYPES.USECASE &&
      workflowLevel === WORKFLOW_LEVELS.USECASE
    ) {
      setIsLoading(false);
      setResolvedData(baseUsecaseData);
      return undefined;
    }

    // ── Cases 2 & 3: both require the subsystem endpoint ─────────────────────
    const isSystemWorkflow = workflowType === WORKFLOW_TYPES.SYSTEM;

    setIsLoading(true);
    getUsecasesFilteredBySubsystem(projectGroupId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!hasBlockingIssues(result) && result.data) {
          const subsystemCategories = mapSubsystemResultsToCategories(
            result.data,
          );

          if (isSystemWorkflow) {
            // Case 3 — System Workflow: combine regular + subsystem categories.
            setResolvedData([...baseUsecaseData, ...subsystemCategories]);
          } else {
            // Case 2 — Subsystem Level: remove usecases that appear in any
            // subsystem group from baseUsecaseData to avoid duplicates.
            const subsystemNames = new Set(
              result.data.flatMap((dto) =>
                dto.usecases.map((uc) => uc.systemId),
              ),
            );

            const filteredBaseData = baseUsecaseData
              .map((cat) => ({
                ...cat,
                items: cat.items.filter(
                  (item) =>
                    !item.systemId || !subsystemNames.has(item.systemId),
                ),
              }))
              .filter((cat) => cat.items.length > 0);

            setResolvedData([...filteredBaseData, ...subsystemCategories]);
          }
        } else {
          logger.error('Failed to fetch subsystem data', {
            action: 'fetch_subsystem_data',
            component: 'useWorkflowUsecaseData',
            error: getIssueMessage(result, 'Failed to fetch subsystem data'),
            projectId: projectGroupId,
          });
          setResolvedData(baseUsecaseData);
        }
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
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workflowType, workflowLevel, projectGroupId, baseUsecaseData]);

  return {isLoading, resolvedData};
}
