/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/** Parse a complete hex or decimal value, preserving floating-point fractions. */
export function parseHexOrDec(value: string, dataType?: string): number {
  const v = value.trim();
  const hex = /^([+-]?)0[xX]([\da-fA-F]+)$/.exec(v);
  if (hex) {
    const num = parseInt(hex[2], 16) * (hex[1] === '-' ? -1 : 1);
    return Number.isFinite(num) ? num : NaN;
  }
  const decimalPattern =
    dataType === 'Float' || dataType === 'Double'
      ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
      : /^[+-]?\d+$/;
  if (!decimalPattern.test(v)) {
    return NaN;
  }
  const num = Number(v);
  return Number.isFinite(num) ? num : NaN;
}
