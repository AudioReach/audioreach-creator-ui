import {type ApiResult, ensureRegistered, httpClient} from "~shared/api"

import type {UsecaseResponseDto} from "../model/usecase.dto"

/**
 * Ensure backend is available and client is registered before making domain calls.
 * Returns false if backend is unavailable or registration failed.
 */
async function ensureBackendReady(): Promise<boolean> {
  return ensureRegistered()
}

/**
 * Fetch all usecases for a specific project.
 * Returns ApiResult<UsecaseResponseDto[]> and does not throw; callers should inspect result.success.
 * @param projectId - The unique identifier of the project
 */
export async function getAllUsecases(
  projectId: string,
): Promise<ApiResult<UsecaseResponseDto[]>> {
  const ready = await ensureBackendReady()
  if (!ready) {
    return {
      message: "Backend unavailable or registration failed",
      success: false,
    }
  }
  return httpClient.get<UsecaseResponseDto[]>(
    `/projects/${projectId}/usecases/allUsecases`,
  )
}
