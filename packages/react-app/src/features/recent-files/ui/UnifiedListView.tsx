import {useMemo} from "react"

import {IconButton} from "@qualcomm-ui/react/button"
import {Database, FolderOpen, Smartphone, Trash2} from "lucide-react"

import type ArcDeviceInfo from "~shared/types/arc-device-info"
import type ArcProjectInfo from "~shared/types/arc-project-info"

type UnifiedItem =
  | {data: ArcProjectInfo; type: "project"}
  | {data: ArcDeviceInfo; type: "device"}

interface UnifiedListViewProps {
  devices: ArcDeviceInfo[]
  onOpenDevice: (device: ArcDeviceInfo) => void
  onOpenProject: (project: ArcProjectInfo) => void
  onRemoveFromRecent: (projectId: string) => void
  onShowInExplorer: (projectId: string) => void
  projects: ArcProjectInfo[]
  showDevices: boolean
  showProjects: boolean
}

function formatDate(date: Date | undefined): string {
  if (!date) {
    return "unknown"
  }

  const dateObj = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - dateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return "today"
  } else if (diffDays === 1) {
    return "1 day ago"
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? "1 month ago" : `${months} months ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return years === 1 ? "1 year ago" : `${years} years ago`
  }
}

export default function UnifiedListView({
  devices,
  onOpenDevice,
  onOpenProject,
  onRemoveFromRecent,
  onShowInExplorer,
  projects,
  showDevices,
  showProjects,
}: UnifiedListViewProps) {
  const items: UnifiedItem[] = useMemo(() => {
    const combined: UnifiedItem[] = []

    // Add projects (sorted by date, most recent first)
    if (showProjects) {
      const sortedProjects = [...projects].sort((a, b) => {
        const dateA = a.lastModifiedDate?.getTime() || 0
        const dateB = b.lastModifiedDate?.getTime() || 0
        return dateB - dateA
      })

      sortedProjects.forEach((p) => combined.push({data: p, type: "project"}))
    }

    // Add devices (as-is, after projects)
    if (showDevices) {
      devices.forEach((d) => combined.push({data: d, type: "device"}))
    }

    return combined
  }, [devices, projects, showDevices, showProjects])

  // Empty state
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12"
        style={{color: "var(--color-text-neutral-secondary)"}}
      >
        <Database className="mb-4" size={48} />
        <p className="text-lg">No items</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) =>
        item.type === "project" ? (
          <div
            key={`project-${item.data.id}`}
            className="flex cursor-pointer items-center gap-4 rounded p-3 transition-colors hover:bg-opacity-10"
            onClick={() => onOpenProject(item.data)}
            style={{
              backgroundColor: "var(--color-surface-raised)",
              border: "1px solid var(--color-border-neutral-02)",
            }}
          >
            {/* Icon */}
            <Database
              size={24}
              style={{color: "var(--color-text-neutral-primary)"}}
            />

            {/* Project Info */}
            <div className="min-w-0 flex-1">
              <h3
                className="truncate font-semibold"
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                {item.data.name}
              </h3>
              <p
                className="truncate text-sm"
                style={{color: "var(--color-text-neutral-secondary)"}}
              >
                {item.data.description || "No description"}
              </p>
            </div>

            {/* Last Edited */}
            <div
              className="whitespace-nowrap text-sm"
              style={{color: "var(--color-text-neutral-secondary)"}}
            >
              Edited {formatDate(item.data.lastModifiedDate)}
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <IconButton
                emphasis="neutral"
                icon={FolderOpen}
                onClick={(e) => {
                  e.stopPropagation()
                  onShowInExplorer(item.data.id)
                }}
                size="sm"
                title="Show in Explorer"
                variant="ghost"
              />
              <IconButton
                emphasis="neutral"
                icon={Trash2}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveFromRecent(item.data.id)
                }}
                size="sm"
                title="Remove from Recent"
                variant="ghost"
              />
            </div>
          </div>
        ) : (
          <div
            key={`device-${item.data.id}`}
            className="flex cursor-pointer items-center gap-4 rounded p-3 transition-colors hover:bg-opacity-10"
            onClick={() => onOpenDevice(item.data)}
            style={{
              backgroundColor: "var(--color-surface-raised)",
              border: "1px solid var(--color-border-neutral-02)",
            }}
          >
            {/* Icon */}
            <Smartphone
              size={24}
              style={{color: "var(--color-text-neutral-primary)"}}
            />

            {/* Device Info */}
            <div className="min-w-0 flex-1">
              <h3
                className="truncate font-semibold"
                style={{color: "var(--color-text-neutral-primary)"}}
              >
                {item.data.name}
              </h3>
              <p
                className="truncate text-sm"
                style={{color: "var(--color-text-neutral-secondary)"}}
              >
                {item.data.description || "No description"}
              </p>
            </div>
          </div>
        ),
      )}
    </div>
  )
}
