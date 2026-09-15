/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ProxyControlLink} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';

import {findPropertyConfigElement} from '../../lib/property-tree-adapter';
import {buildVirtualControlLinkRows,type VirtualControlLinkRowModel} from '../../lib/virtual-link-row-models';

import {useControlLinkCardData} from '../../model/use-control-link-card-data';
import {CollapsibleCard} from '../shared/collapsible-card';
import type {EntityCollapseProps} from '../shared/entity-collapse-props';
import {VirtualControlLinkRow} from './card-fields';

export interface VirtualControlLinkPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  onNavigateToNode: (nodeId: string) => void;
  onVirtualControlLinkRowDelete?: (realControlLinkId: string) => void;
  projectId: string;
  proxyLink: ProxyControlLink;
}

export function VirtualControlLinkPropertiesCard({
  graphData,
  isCollapsed,
  onNavigateToNode,
  onToggle,
  onVirtualControlLinkRowDelete,
  projectId,
  proxyLink,
}: VirtualControlLinkPropertiesCardProps) {
  const rows = buildVirtualControlLinkRows(graphData, proxyLink);

  return (
    <CollapsibleCard
      count={rows.length}
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      title="Virtual Control Link"
    >
      <div className="max-h-80 overflow-auto">
        {rows.map((row) => (
          <VirtualControlLinkRowWithProperties
            key={row.id}
            onDelete={onVirtualControlLinkRowDelete}
            onNavigate={onNavigateToNode}
            projectId={projectId}
            row={row}
          />
        ))}
      </div>
    </CollapsibleCard>
  );
}

function VirtualControlLinkRowWithProperties({
  onDelete,
  onNavigate,
  projectId,
  row,
}: {
  onDelete?: (id: string) => void;
  onNavigate: (nodeId: string) => void;
  projectId: string;
  row: VirtualControlLinkRowModel;
}) {
  const schemaData = useControlLinkCardData({
    controlLinkId: row.id,
    projectId,
  });
  const intents =
    findPropertyConfigElement(schemaData.properties, 'Intents')?.value ??
    findPropertyConfigElement(schemaData.properties, 'Allocated Intents')
      ?.value ??
    '';
  const heapId =
    findPropertyConfigElement(schemaData.properties, 'Heap ID')?.value ?? '';

  return (
    <VirtualControlLinkRow
      heapId={heapId}
      intents={intents}
      isLoadingProperties={schemaData.isLoading}
      onDelete={onDelete}
      onNavigate={onNavigate}
      row={row}
    />
  );
}
