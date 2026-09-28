/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto, NameValueDto} from '~entities/spf-module-data';

export function isBitField(
  allowedValues: (NameValueDto | BitFieldDto)[],
): allowedValues is BitFieldDto[] {
  return allowedValues.length > 0 && 'bitMask' in allowedValues[0];
}
