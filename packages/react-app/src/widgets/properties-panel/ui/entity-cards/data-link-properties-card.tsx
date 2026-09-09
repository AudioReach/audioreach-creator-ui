/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {buildDirectLinkInfo} from '../../lib/node-info';
import {CollapsibleCard} from '../shared/collapsible-card';
import {MissingEntityAlert, ReadOnlyProperty} from './card-fields';

export interface DataLinkPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  linkId: string;
}

export function DataLinkPropertiesCard({
  graphData,
  isCollapsed,
  linkId,
  onToggle,
}: DataLinkPropertiesCardProps) {
  const linkInfo = buildDirectLinkInfo(graphData, linkId);

  if (!linkInfo) {
    return <MissingEntityAlert message="Data link no longer exists" />;
  }

  return (
    <CollapsibleCard
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      title="Data Link"
    >
      <ReadOnlyProperty
        label="Source Component Info"
        value={`${linkInfo.source.component.displayName} (${linkInfo.source.component.id})`}
      />
      <ReadOnlyProperty
        label="Source Port ID"
        value={linkInfo.source.portLabel}
      />
      <ReadOnlyProperty
        label="Destination Component Info"
        value={`${linkInfo.destination.component.displayName} (${linkInfo.destination.component.id})`}
      />
      <ReadOnlyProperty
        label="Destination Port ID"
        value={linkInfo.destination.portLabel}
      />
    </CollapsibleCard>
  );
}
