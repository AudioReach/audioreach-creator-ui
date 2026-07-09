/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto, NameValuePairDto} from '~entities/spf-module-data';

export function isBitField(
  allowedValues: (NameValuePairDto | BitFieldDto)[],
): allowedValues is BitFieldDto[] {
  return allowedValues.length > 0 && allowedValues[0].type === 'BIT_FIELD';
}
