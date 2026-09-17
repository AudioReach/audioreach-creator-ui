/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {
  getUsecasesWithFilter,
  mapUsecaseDtoToCategories,
  type UsecaseCategory,
} from '~entities/usecases';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';

import {buildUsecaseApiFilter} from '../lib/search-filter';
import type {SearchScopeOption} from '../model/usecase-selection-control-store';

/** Debounce delay in milliseconds before the API call is fired. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Performs a debounced backend search for usecases.
 * Reusable by any consumer of UsecaseSelectionControl.
 *
 * Behaviour:
 *   - searchTerm empty  → returns { searchData: null, isSearching: false }
 *                         (caller should show the full unfiltered list)
 *   - searchTerm filled → waits SEARCH_DEBOUNCE_MS, then calls
 *                         GET /projects/{id}/usecases?filter=<transformed>
 *                         and maps the results to UsecaseCategory[]
 *
 * @param projectGroupId - Project identifier used for the API call
 * @param searchTerm     - Raw user input from the search box (not yet transformed)
 * @param scopeOption    - Active scope selector value
 */
export function useUsecaseSearch(
  projectGroupId: string,
  searchTerm: string,
  scopeOption: SearchScopeOption,
): {isSearching: boolean; searchData: UsecaseCategory[] | null} {
  const [searchData, setSearchData] = useState<UsecaseCategory[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Clear results immediately when the input is cleared
    if (!searchTerm.trim()) {
      setSearchData(null);
      setIsSearching(false);
      return;
    }

    // Stale-update guard — prevents state updates after the effect is cleaned up
    let cancelled = false;

    const debounceTimer = setTimeout(() => {
      const filter = buildUsecaseApiFilter(searchTerm, scopeOption);

      logger.info(
        `[useUsecaseSearch] raw="${searchTerm}" scope="${scopeOption}" → filter="${filter}"`,
        {
          action: 'usecase_search',
          component: 'useUsecaseSearch',
          projectId: projectGroupId,
        },
      );

      if (!filter) {
        setSearchData(null);
        return;
      }

      setIsSearching(true);

      getUsecasesWithFilter(projectGroupId, filter)
        .then((result) => {
          if (cancelled) {
            return;
          }
          logger.info(
            `[useUsecaseSearch] API response: blockingIssues=${hasBlockingIssues(result)} count=${result.data?.length ?? 0}`,
            {
              action: 'usecase_search',
              component: 'useUsecaseSearch',
              projectId: projectGroupId,
            },
          );
          if (!hasBlockingIssues(result) && result.data) {
            const categories = mapUsecaseDtoToCategories(result.data);
            logger.info(
              `[useUsecaseSearch] mapped to ${categories.length} categories`,
              {
                action: 'usecase_search',
                component: 'useUsecaseSearch',
                projectId: projectGroupId,
              },
            );
            setSearchData(categories);
          } else {
            logger.error('Usecase search failed', {
              action: 'usecase_search',
              component: 'useUsecaseSearch',
              error: getIssueMessage(result, 'Failed to search usecases'),
              projectId: projectGroupId,
            });
            // Show empty list so the user knows the search ran but found nothing
            setSearchData([]);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          logger.error('Usecase search error', {
            action: 'usecase_search',
            component: 'useUsecaseSearch',
            error: err instanceof Error ? err.message : String(err),
            projectId: projectGroupId,
          });
          setSearchData([]);
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [searchTerm, scopeOption, projectGroupId]);

  return {isSearching, searchData};
}
