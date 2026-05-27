/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type ProjectInfo from '~entities/project/model/project-info.types';
import {SessionMode} from '~entities/project/model/project.dto';
import ArcProjectCard from '~shared/controls/arc-project-card';

interface ArcProjectSectionProps {
  onOpenProject?: (project: ProjectInfo) => void;
  onRemoveFromRecent?: (projectId: string) => void;
  onShowInExplorer?: (projectId: string) => Promise<void>;
  projects?: ProjectInfo[];
  ref?: React.Ref<HTMLElement>;
}

export default function ArcRecentProjects({
  onOpenProject,
  onRemoveFromRecent,
  onShowInExplorer,
  projects,
  ref,
}: ArcProjectSectionProps) {
  function handleDoubleClick(project: ProjectInfo) {
    onOpenProject?.(project);
  }

  function handleRemoveFromRecent(projectId: string) {
    onRemoveFromRecent?.(projectId);
  }

  return (
    <section ref={ref} className="flex flex-col gap-3">
      <h1 className="q-font-heading-xs-subtle">Recent Workspaces</h1>
      <div className="flex flex-wrap gap-2.5">
        {projects === undefined ? (
          <></>
        ) : (
          projects.map((project: ProjectInfo) => {
            // project.sessionMode = "DiffMerge"//testing diff/merge label
            const labelProp = {
              label:
                project.sessionMode === SessionMode.DiffMerge
                  ? 'Diff/Merge'
                  : undefined,
            };
            return (
              <ArcProjectCard
                key={project.id}
                description={project.description}
                imgSource={project.image}
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
            );
          })
        )}
      </div>
    </section>
  );
}
