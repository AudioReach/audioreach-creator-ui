/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {patchContainer} from '~entities/containers';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {PropertyRow, type PropertyOption} from '~shared/controls/property-row';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {
  buildConfigElementValueDirtyItem,
  findConfigElement,
  toNameValueOptions,
} from '../../lib/schema-property-fields';
import {formatDisplayId} from '../../lib/display-id';
import {useContainerCardData} from '../../model/use-container-card-data';
import {useStaticFieldSave} from '../../model/use-static-field-save';
import {MissingEntityAlert} from './card-fields';
import {CollapsibleCard} from '../shared/collapsible-card';
import {SchemaPropertiesTree} from '../shared/schema-properties-tree';

export interface ContainerPropertiesCardProps extends EntityCollapseProps {
  containerId: string;
  graphData: UsecaseGraphData;
  isEditing: boolean;
  onContainerHeapUpdated?: (containerId: string) => Promise<void> | void;
  onContainerIdChange: (containerId: string, newId: string) => void;
  projectId: string;
}

export function ContainerPropertiesCard({
  containerId,
  graphData,
  isCollapsed,
  isEditing,
  onContainerHeapUpdated,
  onContainerIdChange,
  onToggle,
  projectId,
}: ContainerPropertiesCardProps) {
  const container = graphData.containers[containerId];

  if (!container) {
    return <MissingEntityAlert message="Container no longer exists" />;
  }

  return (
    <ContainerPropertiesCardBody
      containerId={container.containerId}
      isCollapsed={isCollapsed}
      isEditing={isEditing}
      onContainerHeapUpdated={onContainerHeapUpdated}
      onContainerIdChange={onContainerIdChange}
      onToggle={onToggle}
      projectId={projectId}
    />
  );
}

function ContainerPropertiesCardBody({
  containerId,
  isCollapsed,
  isEditing,
  onContainerHeapUpdated,
  onContainerIdChange,
  onToggle,
  projectId,
}: {
  containerId: string;
  isCollapsed?: boolean;
  isEditing: boolean;
  onContainerHeapUpdated?: (containerId: string) => Promise<void> | void;
  onContainerIdChange: (containerId: string, newId: string) => void;
  onToggle?: () => void;
  projectId: string;
}) {
  const schemaData = useContainerCardData({
    containerId,
    onContainerHeapUpdated,
    projectId,
  });
  const saveContainerId = useCallback(
    async (nextId: string) => {
      const result = await patchContainer(projectId, containerId, {
        containerId: nextId,
      });

      if (!result.success) {
        return {message: result.message, ok: false};
      }

      const committedId = result.data?.containerId ?? nextId;
      onContainerIdChange(containerId, committedId);
      return {ok: true, value: committedId};
    },
    [containerId, onContainerIdChange, projectId],
  );
  const idSave = useStaticFieldSave({
    delayMs: 300,
    onSave: saveContainerId,
    value: containerId,
  });
  const containerType = findConfigElement(schemaData.data, 'Container Type');
  const containerTypeOptions = toNameValueOptions(containerType);
  const displayContainerId = formatDisplayId(containerId);

  return (
    <CollapsibleCard
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      title={displayContainerId}
    >
      <PropertyRow
        error={idSave.error}
        isEditing={isEditing}
        isSaving={idSave.isSaving}
        label="Container ID"
        mode="text"
        onChange={(value) => idSave.saveText(String(value))}
        value={formatDisplayId(String(idSave.value))}
      />
      {containerTypeOptions.length > 0 ? (
        <ContainerTypePreview
          isEditing={isEditing}
          isSaving={schemaData.isSaving}
          onChange={(value) => {
            const dirtyItem = buildConfigElementValueDirtyItem(
              schemaData.data,
              'Container Type',
              value,
            );
            if (dirtyItem) {
              void schemaData.handleCommit([dirtyItem]);
            }
          }}
          options={containerTypeOptions}
          value={containerType?.value ?? ''}
        />
      ) : null}
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

function ContainerTypePreview({
  isEditing,
  isSaving,
  onChange,
  options,
  value,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onChange: (value: string) => void;
  options: PropertyOption[];
  value: string;
}) {
  return (
    <PropertyRow
      isEditing={isEditing}
      isSaving={isSaving}
      label="Container Type"
      mode="select"
      onChange={(nextValue) => onChange(String(nextValue))}
      options={options}
      value={value}
    />
  );
}
