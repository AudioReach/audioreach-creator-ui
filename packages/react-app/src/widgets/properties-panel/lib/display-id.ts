/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  ConvertNumberToMinimalHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

export function formatDisplayId(value: string): string {
  const parsed = ConvertStringToNumber(value);
  if (parsed === null) {
    return value;
  }

  return ConvertNumberToMinimalHexString(parsed) ?? value;
}
