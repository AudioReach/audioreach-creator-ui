/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {formatUsecaseDisplay} from '../lib/usecase-format';

import type {
  SubsystemFilteredUsecasesDto,
  UsecaseDto,
  UsecaseIdentifier,
} from './usecase.dto';
import type {UsecaseCategory, UsecaseItem} from './usecase.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts a UsecaseIdentifier (full DTO) to a lean UsecaseItem for the UI. */
function usecaseIdentifierToItem(uc: UsecaseIdentifier): UsecaseItem {
  return {
    expanded: false,
    keyValuePairs: uc.keyValuePairs,
    name: formatUsecaseDisplay(uc),
    systemId: uc.systemId,
  };
}

// ── Mappers ───────────────────────────────────────────────────────────────────

/**
 * Maps backend UsecaseDto array to UI UsecaseCategory format.
 * Each unique usecaseCategory value becomes one UsecaseCategory.
 * Usecases without a category are grouped under "Default".
 */
export function mapUsecaseDtoToCategories(
  usecases: UsecaseDto[],
): UsecaseCategory[] {
  const categoryMap = new Map<string, UsecaseDto[]>();

  usecases.forEach((usecase) => {
    const categoryName = usecase.usecaseCategory || 'Default';
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, []);
    }
    categoryMap.get(categoryName)!.push(usecase);
  });

  const categories: UsecaseCategory[] = [];
  categoryMap.forEach((usecases, categoryName) => {
    categories.push({
      expanded: false,
      items: usecases.map(usecaseIdentifierToItem),
      name: categoryName,
    });
  });
  return categories;
}

/**
 * Maps subsystem filtered results to a single UsecaseCategory named
 * "Subsystem Filtered Usecases".
 *
 * Each SubsystemFilteredUsecasesDto becomes a UsecaseItem (subsystem group)
 * whose name is derived from filteredKv, whose children are the usecases
 * belonging to that subsystem.
 */
export function mapSubsystemResultsToCategories(
  results: SubsystemFilteredUsecasesDto[],
): UsecaseCategory[] {
  const groupItems: UsecaseItem[] = results.map((result) => ({
    children: result.usecases.map(usecaseIdentifierToItem),
    expanded: true,
    keyValuePairs: result.filteredKv.keyValuePairs,
    // No systemId for group headers yet
    name: formatUsecaseDisplay(result.filteredKv),
  }));

  return [
    {
      expanded: true,
      items: groupItems,
      name: 'Subsystem Filtered Usecases',
    },
  ];
}
