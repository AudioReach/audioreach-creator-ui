/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  Key,
  KeyValue,
  GraphKey as ModuleTagKey,
} from '~shared/types/key-configurator-config.types';

export interface TagGroup {
  id: number;
  keys: Record<string, ModuleTagKey>;
  name: string;
}

export interface TkvParameter {
  checked: boolean;
  name: string;
  pid: number;
}

export interface ConfiguredTkv {
  keyValuePairs: Array<{
    key: Key;
    value: KeyValue;
  }>;
  pidConfig: number[];
  tagGroup: string;
  tagGroupId: number;
}
