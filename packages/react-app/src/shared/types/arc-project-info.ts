import type {SessionMode} from "~entities/project/model/types"

// FIXME: rename to ArcRecentProjectInfo
/** Contains project details used for display in the UI */
export default interface ArcProjectInfo {
  /** A short description of the project */
  description: string
  /** The absolute file path to the project *.qwsp on the filesystem */
  filepath: string
  /** Unique id for rendering project info in a list */
  id: string
  /** A base64 encoded image used for display on the start page*/
  image?: string
  /** The date the project was last modified */
  lastModifiedDate: Date | undefined
  /** The name of the project */
  name: string
  /** The session mode */
  sessionMode?: SessionMode
}
