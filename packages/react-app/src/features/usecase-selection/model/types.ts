// Re-export DTO types for UI convenience
export type {
  UsecaseIdentifier as Usecase,
  KeyValueInfo as KeyValue,
  FilteredKV,
  UsecaseResponseDto as UsecaseList,
  RelatedEndPointLink,
} from "~entities/usecases/model/usecase.dto"

// Import for internal use
import type {UsecaseIdentifier} from "~entities/usecases/model/usecase.dto"

// Pure UI types - not in DTO or store
export interface UsecaseCategory {
  expanded: boolean
  name: string
  usecases: UsecaseIdentifier[]
}

export type SearchSetting =
  | "Default Search"
  | "Match Value(s)"
  | "Match Usecase"

export interface SearchKeyword {
  description: string
  name: string
}
