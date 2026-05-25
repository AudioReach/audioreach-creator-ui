/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {SliceStatus} from '../global-store.types';

export interface UsecaseSelectionSlice {
  addSelectedUsecase: (usecase: string) => void;
  clearSelectedUsecases: () => void;
  removeSelectedUsecase: (usecase: string) => void;
  selectedUsecases: string[];
  setSelectedUsecases: (usecases: string[]) => void;
  usecaseSelectionStatus: SliceStatus;
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the usecase-selection slice for composing into a tab store.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @returns The initial state and actions for the usecase-selection slice.
 */
export function createUsecaseSelectionSlice<S extends UsecaseSelectionSlice>(
  set: StoreApi<S>['setState'],
): UsecaseSelectionSlice {
  return {
    addSelectedUsecase: (usecase: string) => {
      logger.debug('usecaseSelectionSlice: addSelectedUsecase', {
        action: 'addSelectedUsecase',
        component: 'usecaseSelectionSlice',
      });
      set((state: S) => {
        if (state.selectedUsecases.includes(usecase)) {
          return {} as Partial<S>;
        }
        return {
          selectedUsecases: [...state.selectedUsecases, usecase],
        } as Partial<S>;
      });
    },

    clearSelectedUsecases: () => {
      logger.debug('usecaseSelectionSlice: clearSelectedUsecases', {
        action: 'clearSelectedUsecases',
        component: 'usecaseSelectionSlice',
      });
      set({selectedUsecases: [] as string[]} as Partial<S>);
    },

    removeSelectedUsecase: (usecase: string) => {
      logger.debug('usecaseSelectionSlice: removeSelectedUsecase', {
        action: 'removeSelectedUsecase',
        component: 'usecaseSelectionSlice',
      });
      set(
        (state: S) =>
          ({
            selectedUsecases: state.selectedUsecases.filter(
              (uc) => uc !== usecase,
            ),
          }) as Partial<S>,
      );
    },

    selectedUsecases: [],

    setSelectedUsecases: (usecases: string[]) => {
      logger.debug('usecaseSelectionSlice: setSelectedUsecases', {
        action: 'setSelectedUsecases',
        component: 'usecaseSelectionSlice',
      });
      set({selectedUsecases: usecases} as Partial<S>);
    },

    usecaseSelectionStatus: 'uninitialized',
  };
}
