import type {UsecaseCategory} from "~shared/controls/usecase-selection-control/ui/types"

import type {UsecaseIdentifier, UsecaseResponseDto} from "./usecase.dto"

/**
 * Maps backend UsecaseResponseDto to UI UsecaseCategory format
 * Following FSD principles: entity layer handles data transformation
 */
export function mapUsecaseDtoToCategories(
  dtoArray: UsecaseResponseDto[],
): UsecaseCategory[] {
  console.log("[mapUsecaseDtoToCategories] Input DTO array:", dtoArray)
  console.log("[mapUsecaseDtoToCategories] DTO array length:", dtoArray.length)

  const categories: UsecaseCategory[] = []

  // Group usecases by category
  const categoryMap = new Map<string, UsecaseIdentifier[]>()

  dtoArray.forEach((dto, dtoIndex) => {
    console.log(`[mapUsecaseDtoToCategories] Processing DTO ${dtoIndex}:`, dto)
    console.log(
      `[mapUsecaseDtoToCategories] DTO has ${dto.usecases.length} usecases`,
    )

    dto.usecases.forEach((usecaseIdentifier, usecaseIndex) => {
      console.log(
        `[mapUsecaseDtoToCategories] Processing usecase ${usecaseIndex}:`,
        usecaseIdentifier,
      )

      // Determine category based on usecase type or alias
      const categoryName = usecaseIdentifier.usecaseAliasName
        ? "Recently Selected"
        : "Default"

      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, [])
        console.log(
          `[mapUsecaseDtoToCategories] Created new category: ${categoryName}`,
        )
      }
      categoryMap.get(categoryName)!.push(usecaseIdentifier)
    })
  })

  // Convert map to array of categories
  categoryMap.forEach((usecases, categoryName) => {
    console.log(
      `[mapUsecaseDtoToCategories] Category "${categoryName}" has ${usecases.length} usecases`,
    )
    categories.push({
      expanded: categoryName === "Recently Selected", // Auto-expand recently selected
      name: categoryName,
      usecases,
    })
  })

  console.log("[mapUsecaseDtoToCategories] Final categories:", categories)
  console.log(
    "[mapUsecaseDtoToCategories] Total categories:",
    categories.length,
  )

  return categories
}

/**
 * Creates empty usecase categories for initial state
 */
export function createEmptyUsecaseCategories(): UsecaseCategory[] {
  return []
}
