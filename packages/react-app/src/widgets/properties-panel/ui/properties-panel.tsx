/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useState} from 'react';

import type {ProxyControlLink, ProxyDataLink} from '~entities/graph';
import type {
  SelectedEdgeRef,
  SelectedNodeRef,
} from '~features/usecase-visualizer';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

import {
  buildPropertyGroups,
  type PropertyGroupItem,
  type PropertyGroupType,
} from '../lib/selection-groups';
import {
  ContainerPropertiesCard,
  ControlLinkPropertiesCard,
  DataLinkPropertiesCard,
  ModulePropertiesCard,
  SubgraphPropertiesCard,
  SubsystemPropertiesCard,
  VirtualControlLinkPropertiesCard,
  VirtualDataLinkPropertiesCard,
} from './entity-cards';
import {CollapsibleCard} from './shared/collapsible-card';
import type {EntityCollapseProps} from './shared/entity-collapse-props';

export type ModulePortCountField =
  'maxControlPorts' | 'maxInputPorts' | 'maxOutputPorts';

export interface PropertiesPanelProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  onContainerIdChange: (
    subgraphSystemId: string,
    containerSystemId: string,
    newContainerSystemId: string,
    newContainerNaturalId: number,
  ) => void;
  onModuleAliasChange: (moduleId: string, alias: string) => void;
  onModuleContainerChange: (moduleId: string, newContainerId: string) => void;
  onModulePortCountChange: (
    moduleId: string,
    field: ModulePortCountField,
    value: number,
  ) => void;
  onNavigateToNode: (nodeId: string) => void;
  onSubgraphNameChange: (id: string, name: string) => void;
  onSubsystemNameChange: (id: string, name: string) => void;
  onVirtualControlLinkRowDelete: (realControlLinkId: string) => void;
  onVirtualDataLinkRowDelete: (realDataLinkId: string) => void;
  projectId: string;
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
  virtualControlLinks?: ProxyControlLink[];
  virtualDataLinks?: ProxyDataLink[];
}

export function PropertiesPanel({
  graphData,
  isEditing,
  onContainerIdChange,
  onModuleAliasChange,
  onModuleContainerChange,
  onModulePortCountChange,
  onNavigateToNode,
  onSubgraphNameChange,
  onSubsystemNameChange,
  onVirtualControlLinkRowDelete,
  onVirtualDataLinkRowDelete,
  projectId,
  selectedEdges,
  selectedNodes,
  virtualControlLinks = [],
  virtualDataLinks = [],
}: PropertiesPanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<
    Partial<Record<PropertyGroupType, boolean>>
  >({});
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>(
    {},
  );
  const groups = useMemo(
    () =>
      buildPropertyGroups({
        graphData,
        selectedEdges,
        selectedNodes,
        virtualControlLinks,
        virtualDataLinks,
      }),
    [
      graphData,
      selectedEdges,
      selectedNodes,
      virtualControlLinks,
      virtualDataLinks,
    ],
  );

  if (groups.length === 0) {
    return (
      <div className="text-neutral-secondary p-4 text-sm">
        Select a node or edge to view properties
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {groups.map((group) => {
        const title = `${group.label} (${group.items.length} selected)`;
        return (
          <CollapsibleCard
            key={group.type}
            isCollapsed={collapsedGroups[group.type] ?? false}
            onToggle={() =>
              setCollapsedGroups((current) => ({
                ...current,
                [group.type]: !(current[group.type] ?? false),
              }))
            }
            title={title}
          >
            {group.items.map((item) => {
              const itemKey = propertyGroupItemKey(group.type, item);
              return renderPropertyCard({
                collapseProps: {
                  isCollapsed: collapsedItems[itemKey] ?? false,
                  onToggle: () =>
                    setCollapsedItems((current) => ({
                      ...current,
                      [itemKey]: !(current[itemKey] ?? false),
                    })),
                },
                graphData,
                isEditing,
                item,
                onContainerIdChange,
                onModuleAliasChange,
                onModuleContainerChange,
                onModulePortCountChange,
                onNavigateToNode,
                onSubgraphNameChange,
                onSubsystemNameChange,
                onVirtualControlLinkRowDelete,
                onVirtualDataLinkRowDelete,
                projectId,
                type: group.type,
              });
            })}
          </CollapsibleCard>
        );
      })}
    </div>
  );
}

function propertyGroupItemKey(
  type: PropertyGroupType,
  item: PropertyGroupItem,
): string {
  if (item.proxyDataLink) {
    return `${type}:${item.proxyDataLink.id}`;
  }
  if (item.proxyControlLink) {
    return `${type}:${item.proxyControlLink.id}`;
  }

  return `${type}:${item.systemId}`;
}

function renderPropertyCard({
  collapseProps,
  graphData,
  isEditing,
  item,
  onContainerIdChange,
  onModuleAliasChange,
  onModuleContainerChange,
  onModulePortCountChange,
  onNavigateToNode,
  onSubgraphNameChange,
  onSubsystemNameChange,
  onVirtualControlLinkRowDelete,
  onVirtualDataLinkRowDelete,
  projectId,
  type,
}: {
  collapseProps: EntityCollapseProps;
  graphData: UsecaseGraphData;
  isEditing: boolean;
  item: PropertyGroupItem;
  onContainerIdChange: (
    subgraphSystemId: string,
    containerSystemId: string,
    newContainerSystemId: string,
    newContainerNaturalId: number,
  ) => void;
  onModuleAliasChange: (moduleId: string, alias: string) => void;
  onModuleContainerChange: (moduleId: string, newContainerId: string) => void;
  onModulePortCountChange: (
    moduleId: string,
    field: ModulePortCountField,
    value: number,
  ) => void;
  onNavigateToNode: (nodeId: string) => void;
  onSubgraphNameChange: (id: string, name: string) => void;
  onSubsystemNameChange: (id: string, name: string) => void;
  onVirtualControlLinkRowDelete: (realControlLinkId: string) => void;
  onVirtualDataLinkRowDelete: (realDataLinkId: string) => void;
  projectId: string;
  type: PropertyGroupType;
}) {
  switch (type) {
    case 'subgraphs':
      return (
        <SubgraphPropertiesCard
          key={`${type}:${item.systemId}`}
          {...collapseProps}
          graphData={graphData}
          isEditing={isEditing}
          onSubgraphNameChange={onSubgraphNameChange}
          projectId={projectId}
          subgraphId={item.systemId}
        />
      );
    case 'containers':
      return (
        <ContainerPropertiesCard
          key={`${type}:${item.systemId}`}
          {...collapseProps}
          containerId={item.systemId}
          graphData={graphData}
          isEditing={isEditing}
          onContainerIdChange={onContainerIdChange}
          projectId={projectId}
          subgraphSystemId={item.subgraphSystemId}
        />
      );
    case 'modules':
      return (
        <ModulePropertiesCard
          key={`${type}:${item.systemId}`}
          {...collapseProps}
          graphData={graphData}
          isEditing={isEditing}
          moduleId={item.systemId}
          onModuleAliasChange={onModuleAliasChange}
          onModuleContainerChange={onModuleContainerChange}
          onModulePortCountChange={onModulePortCountChange}
          projectId={projectId}
        />
      );
    case 'subsystems':
      return (
        <SubsystemPropertiesCard
          key={`${type}:${item.systemId}`}
          {...collapseProps}
          graphData={graphData}
          isEditing={isEditing}
          onSubsystemNameChange={onSubsystemNameChange}
          projectId={projectId}
          subsystemId={item.systemId}
        />
      );
    case 'dataLinks':
      return (
        <DataLinkPropertiesCard
          key={`${type}:${item.systemId}`}
          {...collapseProps}
          graphData={graphData}
          linkId={item.systemId}
        />
      );
    case 'controlLinks':
      return (
        <ControlLinkPropertiesCard
          key={`${type}:${item.systemId}`}
          {...collapseProps}
          graphData={graphData}
          isEditing={isEditing}
          linkId={item.systemId}
          projectId={projectId}
        />
      );
    case 'virtualDataLinks':
      return item.proxyDataLink ? (
        <VirtualDataLinkPropertiesCard
          key={`${type}:${item.proxyDataLink.id}`}
          {...collapseProps}
          graphData={graphData}
          onNavigateToNode={onNavigateToNode}
          onVirtualDataLinkRowDelete={
            isEditing ? onVirtualDataLinkRowDelete : undefined
          }
          proxyLink={item.proxyDataLink}
        />
      ) : null;
    case 'virtualControlLinks':
      return item.proxyControlLink ? (
        <VirtualControlLinkPropertiesCard
          key={`${type}:${item.proxyControlLink.id}`}
          {...collapseProps}
          graphData={graphData}
          onNavigateToNode={onNavigateToNode}
          onVirtualControlLinkRowDelete={
            isEditing ? onVirtualControlLinkRowDelete : undefined
          }
          projectId={projectId}
          proxyLink={item.proxyControlLink}
        />
      ) : null;
  }
}
