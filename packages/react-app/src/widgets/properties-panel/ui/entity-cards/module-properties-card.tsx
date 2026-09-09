/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {patchSpfModule} from '~entities/spf-modules';
import type {
  ModuleInstance,
  Port,
  UsecaseGraphData,
} from '~features/graph-designer/model/graph-data-slice';
import {PropertyRow} from '~shared/controls/property-row';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {formatDisplayId} from '../../lib/display-id';
import {useStaticFieldSave} from '../../model/use-static-field-save';
import {CollapsibleCard} from '../shared/collapsible-card';
import {CopyableIdRow, MissingEntityAlert, PortsList} from './card-fields';

type PortCountField = 'maxControlPorts' | 'maxInputPorts' | 'maxOutputPorts';
type ModuleWithPortCounts = ModuleInstance &
  Partial<Record<PortCountField, number>>;

export interface ModulePropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  moduleId: string;
  onModuleAliasChange: (moduleId: string, alias: string) => void;
  onModuleContainerChange: (moduleId: string, newContainerId: string) => void;
  onModulePortCountChange: (
    moduleId: string,
    field: PortCountField,
    value: number,
  ) => void;
  projectId: string;
}

export function ModulePropertiesCard({
  graphData,
  isCollapsed,
  isEditing,
  moduleId,
  onModuleAliasChange,
  onModuleContainerChange,
  onModulePortCountChange,
  onToggle,
  projectId,
}: ModulePropertiesCardProps) {
  const module = graphData.moduleInstances[moduleId];

  if (!module) {
    return <MissingEntityAlert message="Module no longer exists" />;
  }

  return (
    <ModulePropertiesCardBody
      isCollapsed={isCollapsed}
      isEditing={isEditing}
      module={module}
      moduleId={moduleId}
      onModuleAliasChange={onModuleAliasChange}
      onModuleContainerChange={onModuleContainerChange}
      onModulePortCountChange={onModulePortCountChange}
      onToggle={onToggle}
      projectId={projectId}
    />
  );
}

function ModulePropertiesCardBody({
  isCollapsed,
  isEditing,
  module,
  moduleId,
  onModuleAliasChange,
  onModuleContainerChange,
  onModulePortCountChange,
  onToggle,
  projectId,
}: {
  isCollapsed?: boolean;
  isEditing: boolean;
  module: ModuleInstance;
  moduleId: string;
  onModuleAliasChange: (moduleId: string, alias: string) => void;
  onModuleContainerChange: (moduleId: string, newContainerId: string) => void;
  onModulePortCountChange: (
    moduleId: string,
    field: PortCountField,
    value: number,
  ) => void;
  onToggle?: () => void;
  projectId: string;
}) {
  const aliasSave = useStaticFieldSave({
    delayMs: 300,
    onSave: useCallback(
      async (alias: string) => {
        const result = await patchSpfModule(projectId, moduleId, {alias});
        if (!result.success) {
          return {message: result.message, ok: false};
        }

        const committedAlias = result.data?.alias ?? alias;
        onModuleAliasChange(moduleId, committedAlias);
        return {ok: true, value: committedAlias};
      },
      [moduleId, onModuleAliasChange, projectId],
    ),
    value: module.displayName,
  });
  const containerSave = useStaticFieldSave({
    delayMs: 300,
    onSave: useCallback(
      async (containerSystemId: string) => {
        const result = await patchSpfModule(projectId, moduleId, {
          containerSystemId,
        });
        if (!result.success) {
          return {message: result.message, ok: false};
        }

        const committedContainerId =
          result.data?.containerId !== undefined
            ? String(result.data.containerId)
            : containerSystemId;
        onModuleContainerChange(moduleId, committedContainerId);
        return {ok: true, value: committedContainerId};
      },
      [moduleId, onModuleContainerChange, projectId],
    ),
    value: module.containerId,
  });
  const inputCountSave = usePortCountSave({
    field: 'maxInputPorts',
    moduleId,
    onModulePortCountChange,
    projectId,
    value: modulePortCount(module, 'maxInputPorts', module.inputPorts, 'data'),
  });
  const outputCountSave = usePortCountSave({
    field: 'maxOutputPorts',
    moduleId,
    onModulePortCountChange,
    projectId,
    value: modulePortCount(
      module,
      'maxOutputPorts',
      module.outputPorts,
      'data',
    ),
  });
  const controlCountSave = usePortCountSave({
    field: 'maxControlPorts',
    moduleId,
    onModulePortCountChange,
    projectId,
    value: modulePortCount(
      module,
      'maxControlPorts',
      module.inputPorts,
      'control',
    ),
  });

  return (
    <CollapsibleCard
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      title={module.displayName}
    >
      <PropertyRow
        error={aliasSave.error}
        isEditing={isEditing}
        isSaving={aliasSave.isSaving}
        label="Alias"
        mode="text"
        onChange={(value) => aliasSave.saveText(String(value))}
        value={aliasSave.value}
      />
      <CopyableIdRow label="Module ID" value={module.moduleId} />
      <CopyableIdRow label="Instance ID" value={module.moduleInstanceId} />
      <PropertyRow
        error={containerSave.error}
        isEditing={isEditing}
        isSaving={containerSave.isSaving}
        label="Container ID"
        mode="text"
        onChange={(value) => containerSave.saveText(String(value))}
        value={formatDisplayId(String(containerSave.value))}
      />
      <PropertyRow
        error={inputCountSave.error}
        isEditing={isEditing}
        isSaving={inputCountSave.isSaving}
        label="Max Input Ports"
        mode="number"
        onChange={(value) => void inputCountSave.saveImmediate(Number(value))}
        readOnly={!hasDynamicDataPort(module.inputPorts)}
        value={inputCountSave.value}
      />
      <PropertyRow
        error={outputCountSave.error}
        isEditing={isEditing}
        isSaving={outputCountSave.isSaving}
        label="Max Output Ports"
        mode="number"
        onChange={(value) => void outputCountSave.saveImmediate(Number(value))}
        readOnly={!hasDynamicDataPort(module.outputPorts)}
        value={outputCountSave.value}
      />
      <PropertyRow
        error={controlCountSave.error}
        isEditing={isEditing}
        isSaving={controlCountSave.isSaving}
        label="Max Control Ports"
        mode="number"
        onChange={(value) => void controlCountSave.saveImmediate(Number(value))}
        value={controlCountSave.value}
      />
      <PortsList ports={module.inputPorts} title="Input Ports" />
      <PortsList ports={module.outputPorts} title="Output Ports" />
    </CollapsibleCard>
  );
}

function hasDynamicDataPort(ports: Port[]): boolean {
  return ports.some((port) => port.portType === 'data' && !port.isStatic);
}

function portCount(ports: Port[], portType: 'control' | 'data'): number {
  return ports.filter((port) => port.portType === portType).length;
}

function modulePortCount(
  module: ModuleInstance,
  field: PortCountField,
  ports: Port[],
  portType: 'control' | 'data',
): number {
  const explicitCount = (module as ModuleWithPortCounts)[field];
  return typeof explicitCount === 'number'
    ? explicitCount
    : portCount(ports, portType);
}

function patchFieldForPortCount(field: PortCountField): {
  maxControlPortsSupported?: number;
  maxInputPortsSupported?: number;
  maxOutputPortsSupported?: number;
} {
  switch (field) {
    case 'maxControlPorts':
      return {maxControlPortsSupported: 0};
    case 'maxInputPorts':
      return {maxInputPortsSupported: 0};
    case 'maxOutputPorts':
      return {maxOutputPortsSupported: 0};
  }
}

function usePortCountSave({
  field,
  moduleId,
  onModulePortCountChange,
  projectId,
  value,
}: {
  field: PortCountField;
  moduleId: string;
  onModulePortCountChange: (
    moduleId: string,
    field: PortCountField,
    value: number,
  ) => void;
  projectId: string;
  value: number;
}) {
  return useStaticFieldSave({
    delayMs: 0,
    onSave: useCallback(
      async (nextValue: number) => {
        const [requestField] = Object.keys(
          patchFieldForPortCount(field),
        ) as Array<keyof ReturnType<typeof patchFieldForPortCount>>;
        const result = await patchSpfModule(projectId, moduleId, {
          [requestField]: nextValue,
        });

        if (!result.success) {
          return {message: result.message, ok: false};
        }

        onModulePortCountChange(moduleId, field, nextValue);
        return {ok: true, value: nextValue};
      },
      [field, moduleId, onModulePortCountChange, projectId],
    ),
    value,
  });
}
