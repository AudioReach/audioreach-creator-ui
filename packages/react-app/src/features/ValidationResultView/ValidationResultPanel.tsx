import type {FC} from "react"

import ValidationResultTable from "./ValidationResultTable"
import ValidationResultToolbar from "./ValidationResultToolbar"

/**
 * Combines ValidationResultToolbar and ValidationResultTable with proper styling for FlexLayout integration
 */
const ValidationResultPanel: FC = () => {
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
        <ValidationResultToolbar />
      </div>

      {/* Table - flexible height with internal scrolling */}
      <div
        style={{
          minHeight: "0",
        }}
      >
        <ValidationResultTable />
      </div>
    </div>
  )
}

export default ValidationResultPanel
