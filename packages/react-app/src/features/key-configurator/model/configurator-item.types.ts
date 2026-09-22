/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export enum ConfigurationItemType {
  MODULE = 'Module',
  SUBGRAPH = 'Subgraph',
  SUBSYSTEM = 'Subsystem',
}

interface BaseConfigurationItem {
  id: number;
  name: string;
  systemId: string;
}

export interface ModuleConfigurationItem extends BaseConfigurationItem {
  moduleDefinitionSystemId: string;
  type: ConfigurationItemType.MODULE;
}

export interface SubgraphConfigurationItem extends BaseConfigurationItem {
  type: ConfigurationItemType.SUBGRAPH;
}

export interface SubsystemConfigurationItem extends BaseConfigurationItem {
  type: ConfigurationItemType.SUBSYSTEM;
}

export type ConfigurationItem =
  | ModuleConfigurationItem
  | SubgraphConfigurationItem
  | SubsystemConfigurationItem;
