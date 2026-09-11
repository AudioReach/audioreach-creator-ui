/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ProxyDataLink} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {
  buildMdfModuleRows,
  buildVirtualDataLinkRows,
} from '../../lib/virtual-link-row-models';
import {CollapsibleCard} from '../shared/collapsible-card';
import {
  MdfModuleRow,
  MissingEntityAlert,
  VirtualDataLinkRow,
} from './card-fields';

export interface VirtualDataLinkPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  onNavigateToNode: (nodeId: string) => void;
  onVirtualDataLinkRowDelete: (realDataLinkId: string) => void;
  proxyLink: ProxyDataLink;
}

export function VirtualDataLinkPropertiesCard({
  graphData,
  isCollapsed,
  onNavigateToNode,
  onToggle,
  onVirtualDataLinkRowDelete,
  proxyLink,
}: VirtualDataLinkPropertiesCardProps) {
  if (proxyLink.kind === undefined) {
    return (
      <MissingEntityAlert message="Virtual data link type is unavailable" />
    );
  }

  if (proxyLink.kind === 'subsystem') {
    return (
      <MissingEntityAlert message="Subsystem proxy data link is not virtual" />
    );
  }

  const rows = buildVirtualDataLinkRows(graphData, proxyLink);
  const mdfRows = buildMdfModuleRows(graphData, proxyLink);

  return (
    <CollapsibleCard
      count={rows.length}
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      title="Virtual Data Link"
    >
      <div className="max-h-80 overflow-auto">
        {rows.map((row) => (
          <VirtualDataLinkRow
            key={row.id}
            onDelete={
              proxyLink.kind === 'standard'
                ? onVirtualDataLinkRowDelete
                : undefined
            }
            onNavigate={
              proxyLink.kind === 'standard' ? onNavigateToNode : undefined
            }
            row={row}
          />
        ))}
        {proxyLink.kind === 'mdf'
          ? mdfRows.map((row) => <MdfModuleRow key={row.id} row={row} />)
          : null}
      </div>
    </CollapsibleCard>
  );
}
