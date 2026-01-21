import type {UsecaseCategory} from "~features/usecase-selection"

import type {UsecaseIdentifier} from "./usecase.dto"

/**
 * Formats a usecase identifier into a display string
 * This matches the format used in UsecaseSelectionControl
 */
export function formatUsecaseDisplay(usecase: UsecaseIdentifier): string {
  return usecase.keyValueCollection.map((kv) => kv.valueLabel).join(" • ")
}

/**
 * Extracts systemIds from formatted usecase strings by matching them
 * against the original usecase data
 *
 * @param formattedUsecases - Array of formatted usecase strings (e.g., ["Value1 • Value2"])
 * @param usecaseData - Original usecase category data containing UsecaseIdentifier objects
 * @returns Array of systemIds corresponding to the selected usecases
 */
export function getSystemIdsFromFormattedUsecases(
  formattedUsecases: string[],
  usecaseData: UsecaseCategory[],
): string[] {
  if (!formattedUsecases || formattedUsecases.length === 0) {
    return []
  }

  if (!usecaseData || usecaseData.length === 0) {
    return []
  }

  const systemIds: string[] = []

  // Flatten all usecases from all categories
  const allUsecases: UsecaseIdentifier[] = usecaseData.flatMap(
    (category) => category.usecases,
  )

  // For each formatted string, find the matching usecase and extract systemId
  for (const formattedUsecase of formattedUsecases) {
    const matchingUsecase = allUsecases.find(
      (usecase) => formatUsecaseDisplay(usecase) === formattedUsecase,
    )

    if (matchingUsecase && matchingUsecase.systemId) {
      systemIds.push(matchingUsecase.systemId)
    }
  }

  return systemIds
}

/**
 * Gets all UsecaseIdentifier objects from formatted usecase strings
 *
 * @param formattedUsecases - Array of formatted usecase strings
 * @param usecaseData - Original usecase category data
 * @returns Array of UsecaseIdentifier objects
 */
export function getUsecaseIdentifiersFromFormattedUsecases(
  formattedUsecases: string[],
  usecaseData: UsecaseCategory[],
): UsecaseIdentifier[] {
  if (!formattedUsecases || formattedUsecases.length === 0) {
    return []
  }

  if (!usecaseData || usecaseData.length === 0) {
    return []
  }

  const usecaseIdentifiers: UsecaseIdentifier[] = []

  // Flatten all usecases from all categories
  const allUsecases: UsecaseIdentifier[] = usecaseData.flatMap(
    (category) => category.usecases,
  )

  // For each formatted string, find the matching usecase
  for (const formattedUsecase of formattedUsecases) {
    const matchingUsecase = allUsecases.find(
      (usecase) => formatUsecaseDisplay(usecase) === formattedUsecase,
    )

    if (matchingUsecase) {
      usecaseIdentifiers.push(matchingUsecase)
    }
  }

  return usecaseIdentifiers
}
