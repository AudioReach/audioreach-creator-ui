/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {buildDirectLinkInfo} from '../../lib/node-info';
import {useControlLinkCardData} from '../../model/use-control-link-card-data';
import {CollapsibleCard} from '../shared/collapsible-card';
import {SchemaPropertiesTree} from '../shared/schema-properties-tree';
import {MissingEntityAlert, ReadOnlyProperty} from './card-fields';

export interface ControlLinkPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  linkId: string;
  projectId: string;
}

export function ControlLinkPropertiesCard({
  graphData,
  isCollapsed,
  isEditing,
  linkId,
  onToggle,
  projectId,
}: ControlLinkPropertiesCardProps) {
  const linkInfo = buildDirectLinkInfo(graphData, linkId);

  if (!linkInfo) {
    return <MissingEntityAlert message="Control link no longer exists" />;
  }

  return (
    <ControlLinkPropertiesCardBody
      isCollapsed={isCollapsed}
      isEditing={isEditing}
      linkId={linkId}
      onToggle={onToggle}
      projectId={projectId}
    >
      <ReadOnlyProperty
        label="Peer1 Component Info"
        value={`${linkInfo.source.component.displayName} (${linkInfo.source.component.id})`}
      />
      <ReadOnlyProperty
        label="Peer1 Port ID"
        value={linkInfo.source.portLabel}
      />
      <ReadOnlyProperty
        label="Peer2 Component Info"
        value={`${linkInfo.destination.component.displayName} (${linkInfo.destination.component.id})`}
      />
      <ReadOnlyProperty
        label="Peer2 Port ID"
        value={linkInfo.destination.portLabel}
      />
    </ControlLinkPropertiesCardBody>
  );
}

function ControlLinkPropertiesCardBody({
  children,
  isCollapsed,
  isEditing,
  linkId,
  onToggle,
  projectId,
}: {
  children: ReactNode;
  isCollapsed?: boolean;
  isEditing: boolean;
  linkId: string;
  onToggle?: () => void;
  projectId: string;
}) {
  const schemaData = useControlLinkCardData({
    controlLinkId: linkId,
    projectId,
  });

  return (
    <CollapsibleCard
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      title="Control Link"
    >
      {children}
      <SchemaPropertiesTree
        data={schemaData.data}
        error={schemaData.error}
        isEditing={isEditing}
        isLoading={schemaData.isLoading}
        onCommit={(dirtyItems) => void schemaData.handleCommit(dirtyItems)}
        onRetry={() => void schemaData.load()}
        title="Control Link Properties"
      />
      {schemaData.saveError ? (
        <div className="text-sm text-[var(--color-text-danger)]" role="alert">
          {schemaData.saveError}
        </div>
      ) : null}
    </CollapsibleCard>
  );
}
