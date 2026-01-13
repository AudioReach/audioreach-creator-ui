/**
 * Performs a deep equality comparison between two values.
 *
 * This utility function recursively compares objects and arrays to determine
 * if they are structurally equal. It handles primitives, objects, arrays,
 * dates, and null/undefined values.
 *
 * @template T - The type of values being compared
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal, false otherwise
 *
 * @example
 * ```typescript
 * const obj1 = { name: 'John', age: 30, tags: ['dev', 'ts'] };
 * const obj2 = { name: 'John', age: 30, tags: ['dev', 'ts'] };
 * deepEqual(obj1, obj2); // true
 *
 * const obj3 = { name: 'John', age: 31, tags: ['dev', 'ts'] };
 * deepEqual(obj1, obj3); // false
 * ```
 */
export function deepEqual<T>(a: T, b: T, seen = new WeakMap()): boolean {
  // Handle primitive types and reference equality
  if (a === b) {
    return true
  }

  // Handle null and undefined
  if (a == null || b == null) {
    return a === b
  }

  // Handle different types
  if (typeof a !== typeof b) {
    return false
  }

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Handle RegExp objects
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags
  }

  // Handle circular references for objects
  if (typeof a === "object" && a !== null) {
    if (seen.has(a)) {
      return seen.get(a) === b
    }
    seen.set(a, b)
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false
      }
    }

    return true
  }

  // If one is an array and the other is not, they're not equal
  if (Array.isArray(a) || Array.isArray(b)) {
    return false
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)

    // Check if objects have the same number of keys
    if (keysA.length !== keysB.length) {
      return false
    }

    // Check if all keys and values are equal
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false
      }

      if (!deepEqual((a as any)[key], (b as any)[key])) {
        return false
      }
    }

    return true
  }

  // For all other cases (functions, symbols, etc.)
  return false
}
