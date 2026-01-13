import type {FC} from "react"

import LogViewTable from "./ui/LogView/LogViewTable"
import LogViewToolbar from "./ui/LogView/LogViewToolbar"

/**
 * Combines LogViewToolbar and LogViewTable with proper styling for FlexLayout integration
 */
const LogViewPanel: FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div>
        <LogViewToolbar />
      </div>

      {/* Table - flexible height with internal scrolling */}
      <div
        style={{
          overflowY: "auto",
        }}
      >
        <LogViewTable />
      </div>
    </div>
  )
}

export default LogViewPanel
