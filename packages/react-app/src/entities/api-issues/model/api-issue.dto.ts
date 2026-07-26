/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Generic backend issue contract shared across endpoints that report
 * validation/operational problems. `create-usecases` is its first frontend
 * consumer; it is intentionally not apply/discard-specific.
 */

export type IssueSeverity = 'ERROR' | 'FATAL' | 'WARNING';

export type IssueCategory = 'BLOCKING' | 'DATA_LOSS' | 'NON_BLOCKING';

export type IssueEntityType =
  | 'Container'
  | 'ContainerPropertyDefinition'
  | 'ContainerType'
  | 'ControlLink'
  | 'DataLink'
  | 'DriverModule'
  | 'DriverModuleDefinition'
  | 'KeyDefinition'
  | 'ModuleManagerData'
  | 'ProcessorDefinition'
  | 'Project'
  | 'SpfModule'
  | 'SpfModuleDefinition'
  | 'Subgraph'
  | 'SubgraphPropertyDefinition'
  | 'Subsystem'
  | 'TagDefinition'
  | 'Unknown'
  | 'UseCase'
  | 'VcpmModuleDefinition';

export type ClientInputType = 'BOOLEAN' | 'NUMBER' | 'STRING';

export interface ApiImpactedEntityDto {
  displayName?: string;
  entityType: IssueEntityType;
  systemId: string;
}

export interface ApiClientInputSpecDto {
  field: string;
  label: string;
  type: ClientInputType;
}

export interface ApiFixOptionDto {
  commandPayload: Record<string, unknown>;
  commandType: string;
  description: string;
  id: string;
  requiredClientInputs: ApiClientInputSpecDto[];
}

export interface ApiIssueItem {
  category?: IssueCategory;
  code: string;
  fixOptions?: ApiFixOptionDto[];
  impactedEntity?: ApiImpactedEntityDto;
  impactedUsecases?: number[];
  message: string;
  severity: IssueSeverity;
}
