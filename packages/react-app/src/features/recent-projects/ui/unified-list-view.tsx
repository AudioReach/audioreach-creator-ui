/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {Database, FolderOpen, Smartphone, Trash2} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';

import type {ProjectInfo} from '~entities/project';
import type DeviceInfo from '~shared/types/device-info.types';

type UnifiedItem =
  {data: ProjectInfo; type: 'project'} | {data: DeviceInfo; type: 'device'};

interface UnifiedListViewProps {
  devices: DeviceInfo[];
  onOpenDevice: (device: DeviceInfo) => void;
  onOpenProject: (project: ProjectInfo) => void;
  onRemoveFromRecent: (projectId: string) => void;
  onShowInExplorer: (projectId: string) => void;
  projects: ProjectInfo[];
  showDevices: boolean;
  showProjects: boolean;
}

function formatDate(date: Date | undefined): string {
  if (!date) {
    return 'unknown';
  }

  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
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
    const combined: UnifiedItem[] = [];

    // Add projects (sorted by date, most recent first)
    if (showProjects) {
      const sortedProjects = [...projects].sort((a, b) => {
        const dateA = a.lastModifiedDate?.getTime() || 0;
        const dateB = b.lastModifiedDate?.getTime() || 0;
        return dateB - dateA;
      });

      sortedProjects.forEach((p) => combined.push({data: p, type: 'project'}));
    }

    // Add devices (as-is, after projects)
    if (showDevices) {
      devices.forEach((d) => combined.push({data: d, type: 'device'}));
    }

    return combined;
  }, [devices, projects, showDevices, showProjects]);

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-neutral-secondary flex flex-col items-center justify-center py-12">
        <Database className="mb-4" size={48} />
        <p className="text-lg">No items</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) =>
        item.type === 'project' ? (
          <div
            key={`project-${item.data.id}`}
            className="bg-raised border-neutral-02 hover:bg-neutral-hover flex cursor-pointer items-center gap-4 rounded border p-3 transition-colors"
            onClick={() => onOpenProject(item.data)}
          >
            {/* Icon */}
            <Database className="text-neutral-primary" size={24} />

            {/* Project Info */}
            <div className="min-w-0 flex-1">
              <h3 className="text-neutral-primary truncate font-semibold">
                {item.data.name}
              </h3>
              <p className="text-neutral-secondary truncate text-sm">
                {item.data.description || 'No description'}
              </p>
            </div>

            {/* Last Edited */}
            <div className="text-neutral-secondary text-sm whitespace-nowrap">
              Edited {formatDate(item.data.lastModifiedDate)}
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <IconButton
                aria-label="Show in Explorer"
                emphasis="neutral"
                icon={FolderOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  onShowInExplorer(item.data.id);
                }}
                size="sm"
                title="Show in Explorer"
                variant="ghost"
              />
              <IconButton
                aria-label="Remove from Recent"
                emphasis="neutral"
                icon={Trash2}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromRecent(item.data.id);
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
            className="bg-raised border-neutral-02 hover:bg-neutral-hover flex cursor-pointer items-center gap-4 rounded border p-3 transition-colors"
            onClick={() => onOpenDevice(item.data)}
          >
            {/* Icon */}
            <Smartphone className="text-neutral-primary" size={24} />

            {/* Device Info */}
            <div className="min-w-0 flex-1">
              <h3 className="text-neutral-primary truncate font-semibold">
                {item.data.name}
              </h3>
              <p className="text-neutral-secondary truncate text-sm">
                {item.data.description || 'No description'}
              </p>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
