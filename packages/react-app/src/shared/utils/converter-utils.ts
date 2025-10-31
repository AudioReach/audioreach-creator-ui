// converts a string input that may be decimal or hex ("0xFF" or "ff") into a number
export function ConvertStringToNumber(searchTerm: string): number | null {
  const strToLower = searchTerm.trim().toLowerCase()

  // if string is empty after trimming, it’s invalid
  if (!strToLower) {
    return null
  }

  let result: number

  // explicit hex prefix
  if (/^0x[0-9a-f]+$/.test(strToLower)) {
    result = parseInt(strToLower, 16)
  }
  // digits only -> decimal
  else if (/^\d+$/.test(strToLower)) {
    result = parseInt(strToLower, 10)
  } else {
    return null
  }

  // Validate the result is within safe integer range
  if (!Number.isSafeInteger(result)) {
    // TODO: log this as a warining
    return null
  }

  return result
}
