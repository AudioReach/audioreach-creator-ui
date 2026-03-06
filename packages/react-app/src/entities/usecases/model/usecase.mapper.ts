/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseCategory} from '~features/usecase-selection';

import type {UsecaseIdentifier, UsecaseResponseDto} from './usecase.dto';

/**
 * Maps backend UsecaseResponseDto to UI UsecaseCategory format
 * Following FSD principles: entity layer handles data transformation
 */
export function mapUsecaseDtoToCategories(
  dtoArray: UsecaseResponseDto[],
): UsecaseCategory[] {
  const categories: UsecaseCategory[] = [];

  // Group usecases by category
  const categoryMap = new Map<string, UsecaseIdentifier[]>();

  for (const dto of dtoArray) {
    for (const usecaseIdentifier of dto.usecases) {
      // Determine category based on usecase type or alias
      const categoryName = usecaseIdentifier.usecaseAliasName
        ? 'Recently Selected'
        : 'Default';

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(usecaseIdentifier);
    }
  }

  // Convert map to array of categories
  for (const [categoryName, usecases] of categoryMap.entries()) {
    categories.push({
      expanded: categoryName === 'Recently Selected', // Auto-expand recently selected
      name: categoryName,
      usecases,
    });
  }
  return categories;
}

/**
 * Creates empty usecase categories for initial state
 */
export function createEmptyUsecaseCategories(): UsecaseCategory[] {
  return [];
}
