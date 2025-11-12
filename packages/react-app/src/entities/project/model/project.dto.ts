export type ProjectType = "OFFLINE" | "DEVICE"

export enum SessionMode {
  DIFF_MERGE = "DIFF_MERGE",
  DESIGNER = "DESIGNER",
  SIMULATION = "SIMULATION",
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
}

/**
 * Project information returned by the backend
 */
export interface ProjectInfoResponseDto {
  /** Detailed description of the project */
  description: string
  /** Human-readable name of the project */
  name: string
  /** Unique identifier of the project */
  projectId: string
  /** Type of the project (offline or device) */
  projectType: ProjectType
  /** Current session mode for the project */
  sessionMode: SessionMode
}
