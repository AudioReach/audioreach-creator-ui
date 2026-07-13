/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type AnyNode, NODE_KIND} from '~entities/graph';
import {ModuleEnableOverlay} from '~features/graph-designer/ui/module-enable-overlay/module-enable-overlay';
import {SubgraphHeader} from '~features/graph-designer/ui/subgraph-header/subgraph-header';
import type {NodeContentOverride} from '~features/usecase-visualizer';

export function renderNodeContent(node: AnyNode): NodeContentOverride | null {
  if (node.nodeKind === NODE_KIND.MODULE) {
    return {
      coreOverrides: [
        {
          content: <ModuleEnableOverlay moduleInstanceId={node.id} />,
          position: 'top-right',
        },
      ],
    };
  }

  if (node.nodeKind === NODE_KIND.SUBGRAPH) {
    return {
      header: <SubgraphHeader subgraphId={String(node.subgraphId)} />,
    };
  }

  return null;
}
