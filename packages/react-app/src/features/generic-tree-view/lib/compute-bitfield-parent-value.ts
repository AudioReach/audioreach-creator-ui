/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {BitFieldDto} from '~entities/spf-module-data';

import {parseHexOrDec} from './parse-hex-or-dec';

/**
 * Recompute combined parent hex from all bitfield child selections.
 *
 * Shift-by-trailing-zero-count: shift = clz32(mask ^ (mask - 1)) ^ 31,
 * i.e. the index of the mask's lowest set bit.
 */
export function computeBitfieldParentValue(
  _bitFields: BitFieldDto[],
  changedBitMask: string,
  newOptionValue: string,
  currentHex: string,
): string {
  let combined = parseHexOrDec(currentHex);
  const changedMaskNum = parseHexOrDec(changedBitMask);
  const newNum = parseHexOrDec(newOptionValue);

  const shift =
    changedMaskNum === 0
      ? 0
      : Math.clz32(changedMaskNum ^ (changedMaskNum - 1)) ^ 31;
  combined =
    (combined & ~changedMaskNum) | ((newNum << shift) & changedMaskNum);
  return `0x${(combined >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}
