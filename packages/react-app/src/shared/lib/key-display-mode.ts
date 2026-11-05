/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UserPreferences} from '~shared/config/user-preferences-types';

export type KeyDisplayMode = 'key-value' | 'value-only';

export function resolveKeyDisplayMode(
  namePreference: UserPreferences['usecases']['namePreference'],
): KeyDisplayMode {
  return namePreference === 'keyvalues' ? 'key-value' : 'value-only';
}
