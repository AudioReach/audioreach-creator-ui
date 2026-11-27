/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {Button} from '@qualcomm-ui/react/button';

import {patchSubgraph} from '~entities/subgraphs';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {PropertyRow} from '~shared/controls/property-row';

import {findConfigElement} from '../../lib/schema-property-fields';
import {useStaticFieldSave} from '../../model/use-static-field-save';
import {useSubgraphCardData} from '../../model/use-subgraph-card-data';
import {CollapsibleCard} from '../shared/collapsible-card';
import type {EntityCollapseProps} from '../shared/entity-collapse-props';
import {SchemaPropertiesTree} from '../shared/schema-properties-tree';
import {CopyableIdRow, MissingEntityAlert} from './card-fields';

export interface SubgraphPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  onOpenVcpmConfig?: (subgraphId: string, subgraphName: string) => void;
  onScenarioIdChanged?: (subgraphId: string, isVoiceCall: boolean) => void;
  onSchemaPropertyStaged?: () => void;
  onSubgraphNameChange: (id: string, name: string) => void;
  projectId: string;
  subgraphId: string;
}

export function SubgraphPropertiesCard({
  graphData,
  isCollapsed,
  isEditing,
  onOpenVcpmConfig,
  onScenarioIdChanged,
  onSchemaPropertyStaged,
  onSubgraphNameChange,
  onToggle,
  projectId,
  subgraphId,
}: SubgraphPropertiesCardProps) {
  const subgraph = graphData.subgraphs[subgraphId];

  if (!subgraph) {
    return <MissingEntityAlert message="Subgraph no longer exists" />;
  }

  return (
    <SubgraphPropertiesCardBody
      isCollapsed={isCollapsed}
      isEditing={isEditing}
      name={subgraph.subgraphName}
      onOpenVcpmConfig={onOpenVcpmConfig}
      onScenarioIdChanged={onScenarioIdChanged}
      onSchemaPropertyStaged={onSchemaPropertyStaged}
      onSubgraphNameChange={onSubgraphNameChange}
      onToggle={onToggle}
      projectId={projectId}
      subgraphId={subgraphId}
      subgraphNaturalId={subgraph.naturalId}
    />
  );
}

function SubgraphPropertiesCardBody({
  isCollapsed,
  isEditing,
  name,
  onOpenVcpmConfig,
  onScenarioIdChanged,
  onSchemaPropertyStaged,
  onSubgraphNameChange,
  onToggle,
  projectId,
  subgraphId,
  subgraphNaturalId,
}: {
  isCollapsed?: boolean;
  isEditing: boolean;
  name: string;
  onOpenVcpmConfig?: (subgraphId: string, subgraphName: string) => void;
  onScenarioIdChanged?: (subgraphId: string, isVoiceCall: boolean) => void;
  onSchemaPropertyStaged?: () => void;
  onSubgraphNameChange: (id: string, name: string) => void;
  onToggle?: () => void;
  projectId: string;
  subgraphId: string;
  subgraphNaturalId: number;
}) {
  const saveName = useCallback(
    async (nextName: string) => {
      const result = await patchSubgraph(projectId, subgraphId, {
        name: nextName,
      });

      if (hasBlockingIssues(result)) {
        return {
          message: getIssueMessage(result, 'Failed to save subgraph'),
          ok: false,
        };
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
  const schemaData = useSubgraphCardData({
    onScenarioIdChanged,
    onStagedChange: onSchemaPropertyStaged,
    projectId,
    subgraphId,
  });
  const isVoiceCall =
    findConfigElement(schemaData.data, 'Scenario ID')?.value === '3';

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
      <CopyableIdRow label="Subgraph ID" value={String(subgraphNaturalId)} />
      <SchemaPropertiesTree
        data={schemaData.data}
        error={schemaData.error}
        isEditing={isEditing}
        isLoading={schemaData.isLoading}
        loadWarning={schemaData.loadWarning}
        onCommit={(dirtyItems) => void schemaData.handleCommit(dirtyItems)}
        onRetry={() => void schemaData.load()}
        title="Schema Properties"
      />
      {isVoiceCall && onOpenVcpmConfig ? (
        <Button
          onClick={() => onOpenVcpmConfig(subgraphId, name)}
          size="sm"
          variant="outline"
        >
          VCPM Config
        </Button>
      ) : null}
      {schemaData.saveError ? (
        <div className="text-status-error text-sm" role="alert">
          {schemaData.saveError}
        </div>
      ) : null}
    </CollapsibleCard>
  );
}
