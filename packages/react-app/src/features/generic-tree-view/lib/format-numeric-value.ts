/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function normalizeNumericValue(
  value: string,
  dataType?: string,
): string {
  const bits = dataType?.match(/^Int(8|16|32|64)$/)?.[1];
  if (bits && /^0x[\da-f]+$/i.test(value)) {
    return BigInt.asIntN(Number(bits), BigInt(value)).toString();
  }
  return value;
}

export function formatNumericValue(value: string, dataType?: string): string {
  if (dataType === 'RawData' || dataType === 'Float' || dataType === 'Double') {
    return value;
  }
  if (!/^(?:-?\d+|0x[\da-f]+)$/i.test(value)) {
    return value;
  }
  const bits = Number(dataType?.match(/^(?:U?Int)(8|16|32|64)$/)?.[1] ?? 32);
  const number = BigInt(value);
  const encoded = number < 0n ? BigInt.asUintN(bits, number) : number;
  return `0x${encoded
    .toString(16)
    .toUpperCase()
    .padStart(bits / 4, '0')}`;
}
