/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  getAllKeyDefinitions,
  getAllTagDefinitions,
} from '~entities/key-definitions/api/key-definition-api';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalibrationKey {
  defaultValue: unknown;
  keyId: string;
  keyName: string;
  keyType: string;
  value: unknown;
}

export interface ModuleTagKey {
  tagKeyId: string;
  tagKeyName: string;
  value: string;
}

export interface SubgraphConfig {
  config: Record<string, unknown>;
  subgraphId: string;
}

export interface SubsystemConfig {
  config: Record<string, unknown>;
  subsystemId: string;
}

export interface ConfigurationContext {
  itemId: string;
  itemType: 'module' | 'subgraph' | 'subsystem';
  projectId: string;
}

export interface KeyConfigSlice {
  calibrationKeys: CalibrationKey[];
  initializeConfiguration: (context: ConfigurationContext) => Promise<boolean>;
  isEditable: boolean;
  keyConfigStatus: SliceStatus;
  moduleTagKeys: ModuleTagKey[];
  resetConfiguration: () => void;
  saveConfiguration: () => Promise<boolean>;
  setIsEditable: (editable: boolean) => void;
  subgraphConfig: SubgraphConfig | null;
  subsystemConfig: SubsystemConfig | null;
}

type SetState<T> = StoreApi<T>['setState'];

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the key-config slice for composing into a tab store.
 * Used in GraphDesignerStore (always) and DiffMergeStore (lazy).
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @returns The initial state and actions for the key-config slice.
 */
export function createKeyConfigSlice(
  set: SetState<KeyConfigSlice>,
): KeyConfigSlice {
  const setSlice = set;
  let configContext: ConfigurationContext | null = null;
  return {
    calibrationKeys: [],
    initializeConfiguration: async (
      context: ConfigurationContext,
    ): Promise<boolean> => {
      logger.debug('keyConfigSlice: initializeConfiguration — start', {
        action: 'initializeConfiguration',
        component: 'keyConfigSlice',
      });

      // Clear existing keys before loading
      setSlice({
        calibrationKeys: [],
        keyConfigStatus: 'loading',
        moduleTagKeys: [],
        subgraphConfig: null,
        subsystemConfig: null,
      });

      try {
        const [keysResult, tagsResult] = await Promise.all([
          getAllKeyDefinitions(context.projectId),
          getAllTagDefinitions(context.projectId),
        ]);

        if (!keysResult.success || !tagsResult.success) {
          logger.error('keyConfigSlice: initializeConfiguration — API error', {
            action: 'initializeConfiguration',
            component: 'keyConfigSlice',
            error: keysResult.message ?? tagsResult.message,
          });
          setSlice({keyConfigStatus: 'error'});
          return false;
        }

        const calibrationKeys: CalibrationKey[] = (keysResult.data ?? [])
          .filter((k) => k.isCalibrationKey)
          .map((k) => ({
            defaultValue: null,
            keyId: k.systemId,
            keyName: k.name,
            keyType: k.specialKey,
            value: null,
          }));

        const moduleTagKeys: ModuleTagKey[] = (tagsResult.data ?? []).flatMap(
          (tag) =>
            tag.keyDefinitions.map((kd) => ({
              tagKeyId: kd.systemId,
              tagKeyName: kd.name,
              value: '',
            })),
        );

        configContext = context;
        setSlice({
          calibrationKeys,
          keyConfigStatus: 'ready',
          moduleTagKeys,
        });

        logger.debug('keyConfigSlice: initializeConfiguration — done', {
          action: 'initializeConfiguration',
          component: 'keyConfigSlice',
        });

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        logger.error('keyConfigSlice: initializeConfiguration — failed', {
          action: 'initializeConfiguration',
          component: 'keyConfigSlice',
          error: message,
        });

        setSlice({keyConfigStatus: 'error'});
        return false;
      }
    },
    isEditable: false,
    keyConfigStatus: 'uninitialized',
    moduleTagKeys: [],
    resetConfiguration: () => {
      logger.debug('keyConfigSlice: resetConfiguration', {
        action: 'resetConfiguration',
        component: 'keyConfigSlice',
      });

      configContext = null;
      setSlice({
        calibrationKeys: [],
        isEditable: false,
        keyConfigStatus: 'uninitialized',
        moduleTagKeys: [],
        subgraphConfig: null,
        subsystemConfig: null,
      });
    },

    saveConfiguration: async (): Promise<boolean> => {
      const context = configContext;

      if (context === null || context.projectId === '') {
        logger.warn(
          'keyConfigSlice: saveConfiguration — no projectId context',
          {
            action: 'saveConfiguration',
            component: 'keyConfigSlice',
          },
        );
        return false;
      }

      logger.debug('keyConfigSlice: saveConfiguration — start', {
        action: 'saveConfiguration',
        component: 'keyConfigSlice',
        projectId: context.projectId,
      });

      // TODO: Replace with actual backend API call:
      //   await api.saveConfiguration(context.projectId, context.itemId, {
      //     calibrationKeys: get().calibrationKeys,
      //     moduleTagKeys: get().moduleTagKeys,
      //     subgraphConfig: get().subgraphConfig,
      //     subsystemConfig: get().subsystemConfig,
      //   });
      await Promise.resolve(); // placeholder for async backend call

      logger.debug('keyConfigSlice: saveConfiguration — done', {
        action: 'saveConfiguration',
        component: 'keyConfigSlice',
      });

      return true;
    },

    setIsEditable: (editable: boolean) => {
      logger.debug('keyConfigSlice: setIsEditable', {
        action: 'setIsEditable',
        component: 'keyConfigSlice',
      });
      setSlice({isEditable: editable});
    },

    subgraphConfig: null,

    subsystemConfig: null,
  };
}
