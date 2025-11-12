export interface UsecaseResponseDto {
  filteredKV?: FilteredKV
  isFiltered: boolean
  usecases: UsecaseIdentifier[]
}

export interface UsecaseIdentifier {
  keyValueCollection: KeyValueInfo[]
  relatedEndPointLinks?: RelatedEndPointLink[]
  systemId: string
  usecaseAliasId?: number
  usecaseAliasName?: string
  usecaseCategory?: string
  usecaseType: "SubsystemFiltered" | "Ec" | "Regular" | "Manual"
}

export interface KeyValueInfo {
  keyId: number
  keyLabel: string
  valueId: number
  valueLabel: string
}

export interface FilteredKV {
  keyValueCollection: KeyValueInfo[]
  systemId: string
}

export interface RelatedEndPointLink {
  description: string
  hypertextRef: string
  method: string
}
