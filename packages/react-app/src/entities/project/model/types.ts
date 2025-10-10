export type SessionMode =
  | "DiffMerge"
  | "Designer"
  | "Simulation"
  | "Connected"
  | "Disconnected"
export type ProjectType = "Offline" | "Device"
export type MergeType = "ThreeWay" | "TwoWay"

export interface DiffMerge {
  mergeDescription: string
  mergeType: MergeType
}

export interface Project {
  description: string
  diffMerge?: DiffMerge
  name: string
  projectId: string
  projectType: ProjectType
  sessionMode: SessionMode
}
