/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyDefinitionResponseDto} from '~entities/key-definitions';

/** Builds complete backend key-definition DTOs from the fields a fixture needs. */
export function createKeyDefinitionDtos(
  definitions: Array<{
    name: string;
    naturalId: number;
    systemId: string;
    values: Array<{name: string; naturalId: number; systemId: string}>;
  }>,
): KeyDefinitionResponseDto[] {
  return definitions.map(({values, ...definition}) => ({
    enumMember: '',
    enumName: '',
    graphKeyEnumMember: '',
    isCalibrationKey: false,
    isDynamic: false,
    isGraphKey: true,
    isVoice: false,
    ...definition,
    values: values.map((value) => ({enumMember: '', ...value})),
  }));
}
