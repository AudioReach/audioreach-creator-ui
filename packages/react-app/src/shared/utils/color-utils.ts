/**
 * Utility functions for generating dynamic Tailwind color classes
 * for group styling
 */

const COLOR_ID_MAP: Record<number, string> = {
  1: "blue",
  2: "green",
  3: "grey",
  4: "lavender",
  5: "lime",
  6: "magenta",
  7: "mint",
  8: "navy",
  9: "orange",
  10: "pink",
  11: "purple",
  12: "quartz",
  13: "queen",
  14: "quicksilver",
  15: "quincy",
  16: "red",
  17: "teal",
  18: "yellow",
  19: "zinc",
  20: "zircon",
}

/**
 * Converts numeric color ID to semantic color name
 * @param colorId - Numeric color ID (1-20)
 * @returns Semantic color name (e.g., 'blue', 'purple')
 */
export function getColorName(colorId: number): string {
  if (!COLOR_ID_MAP[colorId]) {
    const firstAvailableColor = Object.values(COLOR_ID_MAP)[0]
    console.warn(
      `Invalid color ID: ${colorId}. Falling back to '${firstAvailableColor}'.`,
    )
    return firstAvailableColor
  }
  return COLOR_ID_MAP[colorId]
}
