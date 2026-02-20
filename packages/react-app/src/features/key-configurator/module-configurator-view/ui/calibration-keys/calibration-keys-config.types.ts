/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  GraphKey as CalibrationKey,
  Key,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

export type {CalibrationKey};

export interface CkvParameter {
  checked: boolean;
  name: string;
  pid: number;
}

export interface ConfiguredCkv {
  keyValuePairs: Array<{
    key: Key;
    value: KeyValue;
  }>;
  pidConfig: number[];
}
