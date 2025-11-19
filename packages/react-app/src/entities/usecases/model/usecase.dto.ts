export interface UsecaseResponseDto {
  _usecases: UsecaseIdentifier[]
}

export interface UsecaseIdentifier {
  _keyValueCollection: KeyValueInfo[]
  _relatedEndPointLinks?: RelatedEndPointLink[]
  _systemId: string
  _usecaseAliasId?: number
  _usecaseAliasName?: string
  _usecaseCategory?: string
  _usecaseType: "Ec" | "Regular" | "Manual"
  filteredKV?: FilteredKV
}

export interface KeyValueInfo {
  _keyId: number
  _keyLabel: string
  _valueId: number
  _valueLabel: string
}

export interface FilteredKV {
  keyValueCollection: KeyValueInfo[]
  systemId: string
}

export interface RelatedEndPointLink {
  _description: string
  _hypertextRef: string
  _method: string
}
