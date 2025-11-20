import {type ApiResult, httpClient} from "~shared/api"

import type {UsecaseComponentsDto} from "../model/usecase.component.dto"
import type {UsecaseResponseDto} from "../model/usecase.dto"

/**
 * Fetch all usecases for a specific project.
 * Returns ApiResult<UsecaseResponseDto[]> and does not throw; callers should inspect result.success.
 * @param projectId - The unique identifier of the project
 */
export async function getAllUsecases(
  projectId: string,
): Promise<ApiResult<UsecaseResponseDto[]>> {
  return httpClient.get<UsecaseResponseDto[]>(
    `/projects/${projectId}/usecases/allUsecases`,
  )
}

export async function getUsecaseComponents(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<UsecaseComponentsDto[]>> {
  return httpClient.post<UsecaseComponentsDto[]>(
    `/projects/${projectId}/usecases/components/get`,
    {systemIds},
  )
}
