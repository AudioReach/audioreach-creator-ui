/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiResult} from '~shared/api';

import type {PropertiesResponseDto, PropertyDto} from './property.dto';

export function unwrapPropertiesResponse(
  result: ApiResult<PropertiesResponseDto>,
): ApiResult<PropertyDto[]> {
  const {data, ...rest} = result;
  return {...rest, data: data?.properties};
}
