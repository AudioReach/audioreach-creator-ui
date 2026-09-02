/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Locator, Page} from '@playwright/test';

export type GraphPage = {
  expandFirstSubgraph(projectId: string): Promise<void>;
  firstModuleNode(projectId: string): Locator;
  nodeByIdentity(identity: GraphNodeIdentity): Locator;
  selectedNode(identity: GraphNodeIdentity): Locator;
  selectNode(identity: GraphNodeIdentity): Promise<void>;
};

export type GraphNodeIdentity = {
  readonly nodeInstanceId?: string;
  readonly nodeLabel: string;
  readonly projectId: string;
};

function escapeAttributeValue(value: string): string {
  return value.replace(/[\\"\n\r\f]/g, (character) => `\\${character}`);
}

export function createGraphPage(page: Page): GraphPage {
  function projectById(projectId: string): Locator {
    if (projectId.trim() === '') {
      throw new Error('Cannot locate a graph node without a project ID');
    }

    return page.locator(
      `[data-project-id="${escapeAttributeValue(projectId)}"]`,
    );
  }

  function nodesByLabel(identity: GraphNodeIdentity): Locator {
    return projectById(identity.projectId)
      .getByTestId('module-node')
      .filter({hasText: identity.nodeLabel});
  }

  function nodeByIdentity(identity: GraphNodeIdentity): Locator {
    const nodes = nodesByLabel(identity);
    return (identity.nodeInstanceId
      ? nodes.filter({hasText: `IID: ${identity.nodeInstanceId}`})
      : nodes
    ).describe(`Graph node ${identity.projectId}/${identity.nodeLabel}`);
  }

  return {
    expandFirstSubgraph: async (projectId) => {
      const expandButton = projectById(projectId)
        .getByRole('button', {name: 'Expand subgraph'})
        .first();
      if (await expandButton.isVisible()) {
        await expandButton.focus();
        await expandButton.press('Enter');
      }
    },
    firstModuleNode: (projectId) =>
      projectById(projectId).getByTestId('module-node').first(),
    nodeByIdentity,
    selectedNode: (identity) => {
      const selectedNodes = projectById(identity.projectId).locator(
        '.react-flow__node.selected',
      );
      const instanceText = identity.nodeInstanceId
        ? `IID: ${identity.nodeInstanceId}`
        : undefined;
      const selectedNode = selectedNodes.filter({hasText: identity.nodeLabel});
      return (instanceText
        ? selectedNode.filter({hasText: instanceText})
        : selectedNode
      ).describe(
        `Selected graph node ${identity.projectId}/${identity.nodeLabel}`,
      );
    },
    selectNode: async (identity) => {
      const nodes = nodesByLabel(identity);
      const instanceNode = identity.nodeInstanceId
        ? nodes.filter({hasText: `IID: ${identity.nodeInstanceId}`})
        : nodes;
      const target =
        // TODO: Remove label fallback when backend instance IDs are stable.
        identity.nodeInstanceId && (await instanceNode.count()) > 0
          ? instanceNode.first()
          : nodes.first();
      await target.click();
    },
  };
}
