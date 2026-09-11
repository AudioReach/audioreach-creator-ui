/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {patchSubgraph} from '~entities/subgraphs';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {CopyableIdRow} from '~widgets/properties-panel/ui/entity-cards/card-fields';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';
import {PropertyRow} from '~shared/controls/property-row';

import {useStaticFieldSave} from '../../model/use-static-field-save';
import {useSubgraphCardData} from '../../model/use-subgraph-card-data';
import {CollapsibleCard} from '../shared/collapsible-card';
import {SchemaPropertiesTree} from '../shared/schema-properties-tree';

export interface SubgraphPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  onSubgraphNameChange: (id: string, name: string) => void;
  projectId: string;
  subgraphId: string;
}

export function SubgraphPropertiesCard({
  graphData,
  isCollapsed,
  isEditing,
  onSubgraphNameChange,
  onToggle,
  projectId,
  subgraphId,
}: SubgraphPropertiesCardProps) {
  const subgraph = graphData.subgraphs[subgraphId];

  if (!subgraph) {
    return <div role="alert">Subgraph no longer exists</div>;
  }

  return (
    <SubgraphPropertiesCardBody
      isCollapsed={isCollapsed}
      isEditing={isEditing}
      name={subgraph.subgraphName}
      onSubgraphNameChange={onSubgraphNameChange}
      onToggle={onToggle}
      projectId={projectId}
      subgraphId={subgraphId}
    />
  );
}

function SubgraphPropertiesCardBody({
  isCollapsed,
  isEditing,
  name,
  onSubgraphNameChange,
  onToggle,
  projectId,
  subgraphId,
}: {
  isCollapsed?: boolean;
  isEditing: boolean;
  name: string;
  onSubgraphNameChange: (id: string, name: string) => void;
  onToggle?: () => void;
  projectId: string;
  subgraphId: string;
}) {
  const saveName = useCallback(
    async (nextName: string) => {
      const result = await patchSubgraph(projectId, subgraphId, {
        name: nextName,
      });

      if (!result.success) {
        return {message: result.message, ok: false};
      }

      const committedName = result.data?.name ?? nextName;
      onSubgraphNameChange(subgraphId, committedName);
      return {ok: true, value: committedName};
    },
    [onSubgraphNameChange, projectId, subgraphId],
  );
  const nameSave = useStaticFieldSave({
    delayMs: 300,
    onSave: saveName,
    value: name,
  });
  const schemaData = useSubgraphCardData({projectId, subgraphId});

  return (
    <CollapsibleCard isCollapsed={isCollapsed} onToggle={onToggle} title={name}>
      <PropertyRow
        error={nameSave.error}
        isEditing={isEditing}
        isSaving={nameSave.isSaving}
        label="Name"
        mode="text"
        onChange={(value) => nameSave.saveText(String(value))}
        value={nameSave.value}
      />
      <CopyableIdRow label="Subgraph ID" value={subgraphId} />
      <SchemaPropertiesTree
        data={schemaData.data}
        error={schemaData.error}
        isEditing={isEditing}
        isLoading={schemaData.isLoading}
        onCommit={(dirtyItems) => void schemaData.handleCommit(dirtyItems)}
        onRetry={() => void schemaData.load()}
        title="Schema Properties"
      />
      {schemaData.saveError ? (
        <div className="text-sm text-[var(--color-text-danger)]" role="alert">
          {schemaData.saveError}
        </div>
      ) : null}
    </CollapsibleCard>
  );
}
