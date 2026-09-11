/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ProxyControlLink} from '~entities/graph';
import type {UsecaseGraphData} from '~features/graph-designer/model/graph-data-slice';
import type {EntityCollapseProps} from '~widgets/properties-panel/ui/shared/entity-collapse-props';

import {buildVirtualControlLinkRows} from '../../lib/virtual-link-row-models';
import {CollapsibleCard} from '../shared/collapsible-card';
import {VirtualControlLinkRow} from './card-fields';

export interface VirtualControlLinkPropertiesCardProps extends EntityCollapseProps {
  graphData: UsecaseGraphData;
  onNavigateToNode: (nodeId: string) => void;
  onVirtualControlLinkRowDelete: (realControlLinkId: string) => void;
  proxyLink: ProxyControlLink;
}

export function VirtualControlLinkPropertiesCard({
  graphData,
  isCollapsed,
  onNavigateToNode,
  onToggle,
  onVirtualControlLinkRowDelete,
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
          <VirtualControlLinkRow
            key={row.id}
            onDelete={onVirtualControlLinkRowDelete}
            onNavigate={onNavigateToNode}
            row={row}
          />
        ))}
      </div>
    </CollapsibleCard>
  );
}
