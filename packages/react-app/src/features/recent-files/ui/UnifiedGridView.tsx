import {useMemo} from "react"

import {Database} from "lucide-react"

import {SessionMode} from "~entities/project/model/project.dto"
import ArcProjectCard from "~shared/controls/ArcProjectCard"
import type ArcDeviceInfo from "~shared/types/arc-device-info"
import type ArcProjectInfo from "~shared/types/arc-project-info"

type UnifiedItem =
  | {data: ArcProjectInfo; type: "project"}
  | {data: ArcDeviceInfo; type: "device"}

interface UnifiedGridViewProps {
  devices: ArcDeviceInfo[]
  onOpenDevice: (device: ArcDeviceInfo) => void
  onOpenProject: (project: ArcProjectInfo) => void
  onRemoveFromRecent: (projectId: string) => void
  onShowInExplorer: (projectId: string) => Promise<void>
  projects: ArcProjectInfo[]
  showDevices: boolean
  showProjects: boolean
}

export default function UnifiedGridView({
  devices,
  onOpenDevice,
  onOpenProject,
  onRemoveFromRecent,
  onShowInExplorer,
  projects,
  showDevices,
  showProjects,
}: UnifiedGridViewProps) {
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
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) =>
        item.type === "project" ? (
          <ArcProjectCard
            key={`project-${item.data.id}`}
            description={item.data.description}
            imgSource={item.data.image}
            isActive={false}
            label={
              item.data.sessionMode === SessionMode.DIFF_MERGE
                ? "Diff/Merge"
                : undefined
            }
            lastModifiedDate={item.data.lastModifiedDate}
            onDoubleClick={() => onOpenProject(item.data)}
            onRemoveFromRecent={() => onRemoveFromRecent(item.data.id)}
            onShowInExplorer={async () => await onShowInExplorer(item.data.id)}
            title={item.data.name}
            typeIndicator="project"
          />
        ) : (
          <ArcProjectCard
            key={`device-${item.data.id}`}
            description={item.data.description}
            isActive={false}
            onDoubleClick={() => onOpenDevice(item.data)}
            title={item.data.name}
            typeIndicator="device"
          />
        ),
      )}
    </div>
  )
}
