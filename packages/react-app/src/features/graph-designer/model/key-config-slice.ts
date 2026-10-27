/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

import type {CalibrationKeyConfigSlice} from './calibration-key-config-slice';
import type {ModuleTagKeyConfigSlice} from './module-tag-key-config-slice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  initializeConfiguration: (context: ConfigurationContext) => Promise<boolean>;
  isEditable: boolean;
  keyConfigStatus: SliceStatus;
  resetConfiguration: () => void;
  saveConfiguration: () => Promise<boolean>;
  setIsEditable: (editable: boolean) => void;
  subgraphConfig: SubgraphConfig | null;
  subsystemConfig: SubsystemConfig | null;
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the key-config slice for composing into a tab store.
 * Used in GraphDesignerStore (always) and DiffMergeStore (lazy).
 *
 * @remarks The store type `S` must also compose `CalibrationKeyConfigSlice`
 * and `ModuleTagKeyConfigSlice` — `initializeConfiguration`/
 * `resetConfiguration` fan out to
 * `initializeCalibrationKeyConfiguration`/`resetCalibrationKeyConfiguration`
 * and `initializeModuleTagKeyConfiguration`/`resetModuleTagKeyConfiguration`.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @returns The initial state and actions for the key-config slice.
 */
export function createKeyConfigSlice<
  S extends KeyConfigSlice &
    CalibrationKeyConfigSlice &
    ModuleTagKeyConfigSlice,
>(set: StoreApi<S>['setState'], get: StoreApi<S>['getState']): KeyConfigSlice {
  const setSlice = set;
  let configContext: ConfigurationContext | null = null;
  return {
    initializeConfiguration: async (
      context: ConfigurationContext,
    ): Promise<boolean> => {
      logger.debug('keyConfigSlice: initializeConfiguration — start', {
        action: 'initializeConfiguration',
        component: 'keyConfigSlice',
      });

      setSlice({
        keyConfigStatus: 'loading',
        subgraphConfig: null,
        subsystemConfig: null,
      } as unknown as Partial<S>);

      try {
        const [calibrationOk, tagOk] = await Promise.all([
          get().initializeCalibrationKeyConfiguration(context.projectId),
          get().initializeModuleTagKeyConfiguration(context.projectId),
        ]);

        if (!calibrationOk || !tagOk) {
          logger.error('keyConfigSlice: initializeConfiguration — API error', {
            action: 'initializeConfiguration',
            component: 'keyConfigSlice',
          });
          setSlice({keyConfigStatus: 'error'} as unknown as Partial<S>);
          return false;
        }

        configContext = context;
        setSlice({keyConfigStatus: 'ready'} as unknown as Partial<S>);

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

        setSlice({keyConfigStatus: 'error'} as unknown as Partial<S>);
        return false;
      }
    },
    isEditable: false,
    keyConfigStatus: 'uninitialized',
    resetConfiguration: () => {
      logger.debug('keyConfigSlice: resetConfiguration', {
        action: 'resetConfiguration',
        component: 'keyConfigSlice',
      });

      configContext = null;
      get().resetCalibrationKeyConfiguration();
      get().resetModuleTagKeyConfiguration();
      setSlice({
        isEditable: false,
        keyConfigStatus: 'uninitialized',
        subgraphConfig: null,
        subsystemConfig: null,
      } as unknown as Partial<S>);
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
      setSlice({isEditable: editable} as unknown as Partial<S>);
    },

    subgraphConfig: null,

    subsystemConfig: null,
  };
}
