/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import type {KeyValueInfo} from '../model/usecase.dto';

interface WithKeyValuePairs {
  alias?: string | null;
  keyValuePairs: KeyValueInfo[];
  usecaseAliasName?: string;
}

const ZERO_GKV_LABEL = 'Zero';

const isZeroGkv = (item: WithKeyValuePairs): boolean =>
  item.keyValuePairs.length === 0;

export type UsecaseNamePreference = 'alias' | 'keyvalues' | 'values';

const populated = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

/** BT_Rx • SCO */
export const formatUsecaseDisplay = (item: WithKeyValuePairs): string =>
  item.keyValuePairs.map((kv) => kv.value.name).join(' • ');

export const formatUsecaseName = (
  item: WithKeyValuePairs,
  namePreference: UsecaseNamePreference,
): string => {
  const labelers: Record<UsecaseNamePreference, () => string | undefined> = {
    alias: () => populated(item.alias ?? item.usecaseAliasName),
    keyvalues: () =>
      isZeroGkv(item) ? ZERO_GKV_LABEL : populated(formatAsKeysValues(item)),
    values: () =>
      isZeroGkv(item) ? ZERO_GKV_LABEL : populated(formatUsecaseDisplay(item)),
  };
  const fallbackOrder: UsecaseNamePreference[] = [
    namePreference,
    'values',
    'keyvalues',
    'alias',
  ];
  for (const preference of fallbackOrder) {
    const label = labelers[preference]();
    if (label !== undefined) {
      return label;
    }
  }
  return '';
};

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
