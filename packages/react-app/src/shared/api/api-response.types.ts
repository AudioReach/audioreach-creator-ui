/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type ApiIssueSeverity = 'WARNING' | 'ERROR' | 'FATAL';

export type ApiIssueEntityType =
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

export interface ApiIssueImpactedEntity {
  displayName?: string;
  entityType: ApiIssueEntityType;
  systemId: string;
}

export interface ApiIssueFixOptionClientInput {
  field: string;
  label: string;
  type: 'BOOLEAN' | 'NUMBER' | 'STRING';
}

export interface ApiIssueFixOption {
  commandPayload: Record<string, unknown>;
  commandType: string;
  description: string;
  id: string;
  requiredClientInputs: ApiIssueFixOptionClientInput[];
}

export interface ApiIssue {
  category?: 'BLOCKING' | 'NON_BLOCKING' | 'DATA_LOSS';
  code: string;
  fixOptions?: ApiIssueFixOption[];
  impactedEntity?: ApiIssueImpactedEntity;
  impactedUsecases?: number[];
  message: string;
  severity: ApiIssueSeverity;
}

export interface ApiResult<T = unknown> {
  data?: T;
  issues?: ApiIssue[];
}
