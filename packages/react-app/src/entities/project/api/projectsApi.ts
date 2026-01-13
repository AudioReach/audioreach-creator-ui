import type {ProjectInfoResponseDto} from "~entities/project/model/project.dto"
import {httpClient} from "~shared/api/http-client"
import type {ApiResult} from "~shared/api/types"

/**
 * Fetch all projects.
 * Returns ApiResult<Project[]> and does not throw; callers should inspect result.success.
 */
export async function getProjects(): Promise<
  ApiResult<ProjectInfoResponseDto[]>
> {
  return httpClient.get<ProjectInfoResponseDto[]>("/projects")
}

/**
 * Fetch a specific project by ID.
 * Returns ApiResult<Project> and does not throw; callers should inspect result.success.
 */
export async function getProjectById(
  projectId: string,
): Promise<ApiResult<ProjectInfoResponseDto>> {
  return httpClient.get<ProjectInfoResponseDto>(`/projects/${projectId}`)
}

/**
 * Open/connect to a project by ID.
 * Returns ApiResult<void> indicating success/failure.
 */
export async function openProject(projectId: string): Promise<ApiResult<void>> {
  return httpClient.patch<void>(`/projects/${projectId}/connect-to-project`)
}

/**
 * Close/disconnect a project by ID.
 * Returns ApiResult<void> indicating success/failure.
 */
export async function closeProject(
  projectId: string,
): Promise<ApiResult<void>> {
  return httpClient.patch<void>(
    `/projects/${projectId}/disconnect-from-project`,
  )
}

/**
 * Open a workspace project by uploading acdb and workspace files.
 * Returns ApiResult<ProjectInfoResponseDto> with the created project details.
 * @param acdbFile - The ACDB file to upload
 * @param workspaceFile - The workspace file to upload
 * @param projectName - Optional name for the project
 * @param projectDescription - Optional description for the project
 */
export async function openWorkspaceProject(
  acdbFile: File,
  workspaceFile: File,
  projectName?: string,
  projectDescription?: string,
): Promise<ApiResult<ProjectInfoResponseDto>> {
  // Create FormData for multipart/form-data request
  const formData = new FormData()
  formData.append("acdbFile", acdbFile)
  formData.append("workspaceFile", workspaceFile)

  if (projectName) {
    formData.append("projectName", projectName)
  }

  if (projectDescription) {
    formData.append("projectDescription", projectDescription)
  }

  return httpClient.post<ProjectInfoResponseDto>(
    "projects/offline/upload-files",
    formData,
  )
}
