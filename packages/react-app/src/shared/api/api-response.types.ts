/**
 * Standard API response format returned by all backend endpoints
 */
export interface ApiResult<T = unknown> {
  /**
   * The actual data returned by the API
   */
  data?: T

  /**
   * Array of error messages if any occurred
   */
  errors?: string[]

  /**
   * A human-readable message describing the result
   */
  message: string

  /**
   * Whether the API call was successful
   */
  success: boolean

  /**
   * Array of warning messages that don't prevent operation but should be noted
   */
  warnings?: string[]
}
