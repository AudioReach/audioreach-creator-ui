/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  
  Key,
  KeyValue,
} from '~shared/types/key-configurator-config.types';



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

export {type GraphKey as CalibrationKey} from '~shared/types/key-configurator-config.types';