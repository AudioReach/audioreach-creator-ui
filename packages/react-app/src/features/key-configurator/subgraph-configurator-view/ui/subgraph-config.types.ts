/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Key, KeyValue} from '~shared/types/key-configurator-config.types';

export interface ConfiguredSubgraphKeyValue {
  keyInfo: Key;
  valueInfo: KeyValue;
}
