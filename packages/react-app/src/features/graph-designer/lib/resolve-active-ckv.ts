/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CkvDto} from '~entities/spf-module-data';

const NA_SENTINEL = 'NA';

export type ResolvedCkv =
  | {ckvSystemId: string; isResolved: true}
  | {isResolved: false};

/**
 * Finds the CKV whose key/value pairs are all satisfied by the given header
 * selection. A selection containing the `'NA'` sentinel for any key never
 * matches, since `'NA'` represents "no value chosen yet" rather than a real
 * CKV key value.
 */
export function resolveActiveCkv(
  moduleCkvs: CkvDto[],
  headerSelection: Record<string, string>,
): ResolvedCkv {
  if (Object.values(headerSelection).includes(NA_SENTINEL)) {
    return {isResolved: false};
  }

  const match = moduleCkvs.find((ckv) =>
    ckv.keyValueCollection.every(
      ({keyInfo, valueInfo}) =>
        headerSelection[keyInfo.keySystemId] === valueInfo.valueSystemId,
    ),
  );

  return match
    ? {ckvSystemId: match.systemId, isResolved: true}
    : {isResolved: false};
}
