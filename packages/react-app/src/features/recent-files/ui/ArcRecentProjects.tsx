import {SessionMode} from "~entities/project/model/project.dto"
import ArcProjectCard from "~shared/controls/ArcProjectCard"
import type ArcProjectInfo from "~shared/types/arc-project-info"

interface ArcProjectSectionProps {
  onOpenProject?: (project: ArcProjectInfo) => void
  onRemoveFromRecent?: (projectId: string) => void
  onShowInExplorer?: (projectId: string) => Promise<void>
  projects?: ArcProjectInfo[]
  ref?: React.Ref<HTMLElement>
}

export default function ArcRecentProjects({
  onOpenProject,
  onRemoveFromRecent,
  onShowInExplorer,
  projects,
  ref,
}: ArcProjectSectionProps) {
  function handleDoubleClick(project: ArcProjectInfo) {
    onOpenProject?.(project)
  }

  function handleRemoveFromRecent(projectId: string) {
    onRemoveFromRecent?.(projectId)
  }

  return (
    <section ref={ref} className="flex flex-col gap-3">
      <h1 className="q-font-heading-xs-subtle">Recent Workspaces</h1>
      <div className="flex flex-wrap gap-2.5">
        {projects === undefined ? (
          <></>
        ) : (
          projects.map((project: ArcProjectInfo) => {
            // project.sessionMode = "DiffMerge"//testing diff/merge label
            const labelProp = {
              label:
                project.sessionMode === SessionMode.DIFF_MERGE
                  ? "Diff/Merge"
                  : undefined,
            }
            return (
              <ArcProjectCard
                key={project.id}
                description={project.description}
                isActive={false}
                lastModifiedDate={project.lastModifiedDate}
                onDoubleClick={() => handleDoubleClick(project)}
                onRemoveFromRecent={() => handleRemoveFromRecent(project.id)}
                onShowInExplorer={async () =>
                  await onShowInExplorer?.(project.id)
                }
                title={project.name}
                {...labelProp}
              />
            )
          })
        )}
      </div>
    </section>
  )
}
