import type {UsecaseCategory} from "~shared/controls/usecase-selection-control/ui/types"

import type {UsecaseIdentifier, UsecaseResponseDto} from "./usecase.dto"

/**
 * Maps backend UsecaseResponseDto to UI UsecaseCategory format
 * Following FSD principles: entity layer handles data transformation
 */
export function mapUsecaseDtoToCategories(
  dtoArray: UsecaseResponseDto[],
): UsecaseCategory[] {
  const categories: UsecaseCategory[] = []

  // Group usecases by category
  const categoryMap = new Map<string, UsecaseIdentifier[]>()

  dtoArray.forEach((dto) => {
    dto._usecases.forEach((usecaseIdentifier) => {
      // Determine category based on usecase type or alias
      const categoryName = usecaseIdentifier._usecaseAliasName
        ? "Recently Selected"
        : "Default"

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, [])
      }
      categoryMap.get(categoryName)!.push(usecaseIdentifier)
    })
  })

  // Convert map to array of categories
  categoryMap.forEach((usecases, categoryName) => {
    categories.push({
      expanded: categoryName === "Recently Selected", // Auto-expand recently selected
      name: categoryName,
      usecases,
    })
  })
  return categories
}

/**
 * Creates empty usecase categories for initial state
 */
export function createEmptyUsecaseCategories(): UsecaseCategory[] {
  return []
}
