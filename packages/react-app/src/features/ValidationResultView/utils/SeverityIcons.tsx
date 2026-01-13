import {Icon} from "@qualcomm-ui/react/icon"
import {Info, TriangleAlert, X} from "lucide-react"

import {SeverityType} from "../validation-result-types"

/**
 * Returns the appropriate icon component based on severity level
 */
export const getSeverityIcon = (severity: string) => {
  switch (severity as SeverityType) {
    case SeverityType.CRITICAL:
      return (
        <Icon
          icon={TriangleAlert}
          size="xs"
          style={{
            color: "var(--color-icon-support-danger)",
          }}
        />
      )
    case SeverityType.ERROR:
      return (
        <Icon
          icon={X}
          size="xs"
          style={{
            color: "var(--color-icon-support-danger)",
          }}
        />
      )
    case SeverityType.WARNING:
      return (
        <Icon
          icon={TriangleAlert}
          size="xs"
          style={{
            color: "var(--color-icon-support-warning)",
          }}
        />
      )
    default:
      return (
        <Icon
          icon={Info}
          size="xs"
          style={{
            color: "var(--color-icon-neutral-secondary)",
          }}
        />
      )
  }
}
