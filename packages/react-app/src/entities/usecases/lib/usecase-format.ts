/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import type {KeyValueInfo} from '../model/usecase.dto';

interface WithKeyValuePairs {
  keyValuePairs: KeyValueInfo[];
}

/** BT_Rx • SCO */
export const formatUsecaseDisplay = (item: WithKeyValuePairs): string =>
  item.keyValuePairs.map((kv) => kv.value.name).join(' • ');

/** BT_Rx+SCO */
export const formatAsSearchKey = (item: WithKeyValuePairs): string =>
  item.keyValuePairs.map((kv) => kv.value.name).join('+');

/** [DeviceRX: BT_Rx] [BtProfile: SCO] */
export const formatAsKeysValues = (item: WithKeyValuePairs): string =>
  item.keyValuePairs
    .map((kv) => `[${kv.key.name}: ${kv.value.name}]`)
    .join(' ');

/** [DeviceRX(0xA2000000): BT_Rx(0xA2000003)] [BtProfile(0xB4000000): SCO(0xB4000001)] */
export const formatAsKeysValuesWithIds = (item: WithKeyValuePairs): string =>
  item.keyValuePairs
    .map(
      (kv) =>
        `[${kv.key.name}(${ConvertNumberToHexString(kv.key.naturalId)}): ${kv.value.name}(${ConvertNumberToHexString(kv.value.naturalId)})]`,
    )
    .join(' ');
