import type {ApiResult} from "./types"

/**
 * Process an API response and convert it to an ApiResult
 * @param response The fetch Response object
 * @returns ApiResult object
 */
export async function processApiResponse<T>(
  response: Response,
): Promise<ApiResult<T>> {
  // Handle HTTP errors
  if (!response.ok) {
    return {
      errors: [`HTTP error: ${response.status}`],
      message: `HTTP error: ${response.status} ${response.statusText}`,
      success: false,
    }
  }

  try {
    // Parse the response as JSON
    return await response.json()
  } catch (error) {
    // Handle JSON parsing errors
    return {
      errors: ["Invalid JSON response"],
      message: "Failed to parse response as JSON",
      success: false,
    }
  }
}

/**
 * Handle an ApiResult by logging warnings/errors and extracting data
 * @param apiResult The ApiResult to handle
 * @param context Description of the API call for logging
 * @returns The data from the ApiResult if successful, null otherwise
 */
export function handleApiResult<T>(
  apiResult: ApiResult<T>,
  context: string,
): T | null {
  // Log warnings if any
  if (apiResult.warnings?.length) {
    console.warn(`[BackendAPI] ${context} - Warnings:`, apiResult.warnings)
  }

  // Log errors if any
  if (!apiResult.success && apiResult.errors?.length) {
    console.error(`[BackendAPI] ${context} - Errors:`, apiResult.errors)
  }

  // Return data if successful, null otherwise
  return apiResult.success && apiResult.data !== undefined
    ? apiResult.data
    : null
}
