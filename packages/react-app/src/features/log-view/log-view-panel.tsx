import type {FC} from "react"

import LogViewTable from "./ui/log-view/log-view-table"
import LogViewToolbar from "./ui/log-view/log-view-toolbar"

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
