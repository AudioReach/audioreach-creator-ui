/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

export type ExclusiveSessionMode =
  | 'diff-merge'
  | 'discovery-wizard'
  | 'none'
  | 'usecase-edit';

export interface ExclusiveLockSlice {
  activeExclusiveMode: ExclusiveSessionMode;
  /** Only clears the lock if `mode` is the value currently held — guards
   *  against a stale unmount releasing a lock a newer instance acquired. */
  releaseExclusiveMode: (mode: ExclusiveSessionMode) => void;
  /** Returns `false` if the lock is already held by *any* mode — including
   *  a second attempt to acquire the *same* mode again. Each of Usecase
   *  Edit, Discovery Wizard, and Diff/Merge is a single-instance-per-project
   *  feature. */
  setActiveExclusiveMode: (mode: ExclusiveSessionMode) => boolean;
}

export function createExclusiveLockSlice(
  set: (partial: Partial<ExclusiveLockSlice>) => void,
  get: () => ExclusiveLockSlice,
): ExclusiveLockSlice {
  return {
    activeExclusiveMode: 'none',

    releaseExclusiveMode: (mode: ExclusiveSessionMode): void => {
      if (get().activeExclusiveMode !== mode) {
        return;
      }

      set({activeExclusiveMode: 'none'});

      logger.debug(`Exclusive mode released: ${mode}`, {
        action: 'release_exclusive_mode',
        component: 'ExclusiveLockSlice',
      });
    },

    setActiveExclusiveMode: (mode: ExclusiveSessionMode): boolean => {
      const current = get().activeExclusiveMode;
      if (current !== 'none') {
        logger.debug(
          `Exclusive mode acquisition rejected: requested ${mode}, held ${current}`,
          {
            action: 'set_active_exclusive_mode',
            component: 'ExclusiveLockSlice',
          },
        );
        return false;
      }

      set({activeExclusiveMode: mode});

      logger.debug(`Exclusive mode acquired: ${mode}`, {
        action: 'set_active_exclusive_mode',
        component: 'ExclusiveLockSlice',
      });
      return true;
    },
  };
}
