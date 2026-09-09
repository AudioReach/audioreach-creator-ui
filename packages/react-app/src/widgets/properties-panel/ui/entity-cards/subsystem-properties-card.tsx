/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {patchSubsystem} from '~entities/subsystems';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import {PropertyRow} from '~shared/controls/property-row';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {useStaticFieldSave} from '../../model/use-static-field-save';
import {CollapsibleCard} from '../shared/collapsible-card';
import {CopyableIdRow, MissingEntityAlert} from './card-fields';

export interface SubsystemPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  onSubsystemNameChange: (id: string, name: string) => void;
  projectId: string;
  subsystemId: string;
}

export function SubsystemPropertiesCard({
  graphData,
  isCollapsed,
  isEditing,
  onSubsystemNameChange,
  onToggle,
  projectId,
  subsystemId,
}: SubsystemPropertiesCardProps) {
  const subsystem = graphData.subsystems[subsystemId];

  if (!subsystem) {
    return <MissingEntityAlert message="Subsystem no longer exists" />;
  }

  return (
    <SubsystemPropertiesCardBody
      isCollapsed={isCollapsed}
      isEditing={isEditing}
      name={subsystem.subsystemName}
      onSubsystemNameChange={onSubsystemNameChange}
      onToggle={onToggle}
      projectId={projectId}
      subsystemId={subsystemId}
    />
  );
}

function SubsystemPropertiesCardBody({
  isCollapsed,
  isEditing,
  name,
  onSubsystemNameChange,
  onToggle,
  projectId,
  subsystemId,
}: {
  isCollapsed?: boolean;
  isEditing: boolean;
  name: string;
  onSubsystemNameChange: (id: string, name: string) => void;
  onToggle?: () => void;
  projectId: string;
  subsystemId: string;
}) {
  const saveName = useCallback(
    async (nextName: string) => {
      const result = await patchSubsystem(projectId, subsystemId, {
        name: nextName,
      });

      if (!result.success) {
        return {message: result.message, ok: false};
      }

      const committedName = result.data?.name ?? nextName;
      onSubsystemNameChange(subsystemId, committedName);
      return {ok: true, value: committedName};
    },
    [onSubsystemNameChange, projectId, subsystemId],
  );
  const nameSave = useStaticFieldSave({
    delayMs: 300,
    onSave: saveName,
    value: name,
  });

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
      <CopyableIdRow label="Subsystem ID" value={subsystemId} />
    </CollapsibleCard>
  );
}
