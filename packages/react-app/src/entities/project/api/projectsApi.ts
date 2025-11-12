import type {ProjectInfoResponseDto} from "~entities/project/model/project.dto"
import {httpClient} from "~shared/api/http-client"
import {ensureRegistered} from "~shared/api/register-client"
import type {ApiResult} from "~shared/api/types"

/**
 * Ensure backend is available and client is registered before making domain calls.
 * Returns false if backend is unavailable or registration failed.
 */
async function ensureBackendReady(): Promise<boolean> {
  return ensureRegistered()
}

/**
 * Fetch all projects.
 * Returns ApiResult<Project[]> and does not throw; callers should inspect result.success.
 */
export async function getProjects(): Promise<
  ApiResult<ProjectInfoResponseDto[]>
> {
  const ready = await ensureBackendReady()
  if (!ready) {
    return {
      message: "Backend unavailable or registration failed",
      success: false,
    }
  }
  return httpClient.get<ProjectInfoResponseDto[]>("/projects")
}

/**
 * Fetch a specific project by ID.
 * Returns ApiResult<Project> and does not throw; callers should inspect result.success.
 */
export async function getProjectById(
  projectId: string,
): Promise<ApiResult<ProjectInfoResponseDto>> {
  const ready = await ensureBackendReady()
  if (!ready) {
    return {
      message: `Backend unavailable or registration failed for project ${projectId}`,
      success: false,
    }
  }
  return httpClient.get<ProjectInfoResponseDto>(`/projects/${projectId}`)
}

/**
 * Open/connect to a project by ID.
 * Returns ApiResult<void> indicating success/failure.
 */
export async function openProject(projectId: string): Promise<ApiResult<void>> {
  const ready = await ensureBackendReady()
  if (!ready) {
    return {
      message: `Backend unavailable or registration failed for open ${projectId}`,
      success: false,
    }
  }
  return httpClient.patch<void>(`/projects/${projectId}/connect-to-project`)
}

/**
 * Close/disconnect a project by ID.
 * Returns ApiResult<void> indicating success/failure.
 */
export async function closeProject(
  projectId: string,
): Promise<ApiResult<void>> {
  const ready = await ensureBackendReady()
  if (!ready) {
    return {
      message: `Backend unavailable or registration failed for close ${projectId}`,
      success: false,
    }
  }
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
  console.log("[openWorkspaceProject] Starting file upload process...")
  const ready = await ensureBackendReady()
  console.log("[openWorkspaceProject] Backend ready status:", ready)

  if (!ready) {
    console.error("[openWorkspaceProject] Backend not ready, aborting upload")
    return {
      message: "Backend unavailable or registration failed",
      success: false,
    }
  }

  console.log(
    "[openWorkspaceProject] Backend ready, proceeding with file upload",
  )

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

  // Use httpClient.post with FormData - it now supports multipart/form-data
  console.log("[openWorkspaceProject] Uploading files via httpClient")
  return httpClient.post<ProjectInfoResponseDto>("/offline/files", formData)
}
