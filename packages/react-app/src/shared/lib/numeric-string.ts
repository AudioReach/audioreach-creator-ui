/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

interface CanonicalNumber {
  digits: string;
  exponent: bigint;
  negative: boolean;
}

function canonicalize(
  digits: string,
  exponent: bigint,
  negative: boolean,
): CanonicalNumber {
  const withoutLeadingZeros = digits.replace(/^0+/, '');
  if (!withoutLeadingZeros) {
    return {digits: '0', exponent: 0n, negative: false};
  }

  const trailingZeros = withoutLeadingZeros.match(/0+$/)?.[0].length ?? 0;
  return {
    digits:
      trailingZeros > 0
        ? withoutLeadingZeros.slice(0, -trailingZeros)
        : withoutLeadingZeros,
    exponent: exponent + BigInt(trailingZeros),
    negative,
  };
}

function parseNumericString(value: string): CanonicalNumber | null {
  const trimmed = value.trim();
  const hexMatch = /^([+-]?)(0[xX][0-9a-fA-F]+)$/.exec(trimmed);
  if (hexMatch) {
    const digits = BigInt(hexMatch[2]).toString();
    return canonicalize(digits, 0n, hexMatch[1] === '-');
  }

  const decimalMatch =
    /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(trimmed);
  if (!decimalMatch) {
    return null;
  }

  const whole = decimalMatch[2] ?? '0';
  const fraction = decimalMatch[3] ?? decimalMatch[4] ?? '';
  const exponent = BigInt(decimalMatch[5] ?? '0') - BigInt(fraction.length);
  return canonicalize(`${whole}${fraction}`, exponent, decimalMatch[1] === '-');
}

export function areNumericStringsEqual(left: string, right: string): boolean {
  const leftNumber = parseNumericString(left);
  const rightNumber = parseNumericString(right);
  return (
    leftNumber !== null &&
    rightNumber !== null &&
    leftNumber.negative === rightNumber.negative &&
    leftNumber.digits === rightNumber.digits &&
    leftNumber.exponent === rightNumber.exponent
  );
}
