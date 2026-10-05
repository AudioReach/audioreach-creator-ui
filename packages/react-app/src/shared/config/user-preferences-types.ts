/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * User preferences for visualization settings
 */
export interface VisualizationPreferences {
  expandSubgraphs: boolean;
  highlightPPModules: boolean;
  showContainerIds: boolean;
  showControlLinks: boolean;
  showInterUsecaseLinks: boolean;
  showMdfModules: boolean;
  showModuleInstanceIds: boolean;
  showSubgraphIds: boolean;
  simplifySubsystems: boolean;
  viewMode: 'compact' | 'detailed';
}

/**
 * User preferences for display settings
 */
export interface DisplayPreferences {
  portVisibilityMode: 'all' | 'active';
}

// ── Workflow constants ────────────────────────────────────────────────────────

/** Workflow type values — use instead of raw string literals. */
export const WORKFLOW_TYPES = {
  SYSTEM: 'system-workflow',
  USECASE: 'usecase-workflow',
} as const;

/** Workflow level values — use instead of raw string literals. */
export const WORKFLOW_LEVELS = {
  SUBSYSTEM: 'subsystem-level',
  USECASE: 'usecase-level',
} as const;

/** Derived type from WORKFLOW_TYPES constant values. */
export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];

/** Derived type from WORKFLOW_LEVELS constant values. */
export type WorkflowLevel =
  (typeof WORKFLOW_LEVELS)[keyof typeof WORKFLOW_LEVELS];

/**
 * User preferences for usecase settings
 */
export interface UsecasePreferences {
  namePreference: 'alias' | 'keyvalues' | 'values';
  selectedUsecases: string[];
  workflowLevel: WorkflowLevel;
  workflowType: WorkflowType;
}

/**
 * Complete user preferences structure
 */
export interface UserPreferences {
  display: DisplayPreferences;
  usecases: UsecasePreferences;
  visualization: VisualizationPreferences;
}

/**
 * Default visualization preferences
 */
export const DEFAULT_VISUALIZATION_PREFERENCES: VisualizationPreferences = {
  expandSubgraphs: false,
  highlightPPModules: false,
  showContainerIds: false,
  showControlLinks: true,
  showInterUsecaseLinks: true,
  showMdfModules: false,
  showModuleInstanceIds: false,
  showSubgraphIds: false,
  simplifySubsystems: false,
  viewMode: 'compact',
};

/**
 * Default display preferences
 */
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  portVisibilityMode: 'active',
};

/**
 * Default usecase preferences
 */
export const DEFAULT_USECASE_PREFERENCES: UsecasePreferences = {
  namePreference: 'alias',
  selectedUsecases: [],
  workflowLevel: WORKFLOW_LEVELS.USECASE,
  workflowType: WORKFLOW_TYPES.USECASE,
};

/**
 * Default user preferences (all categories)
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  display: DEFAULT_DISPLAY_PREFERENCES,
  usecases: DEFAULT_USECASE_PREFERENCES,
  visualization: DEFAULT_VISUALIZATION_PREFERENCES,
};
