/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test} from '@playwright/test';

import {createGraphPage} from '../../pages/graph-page';

test('graph page scopes node identity to the active project', async ({
  page,
}) => {
  await page.setContent(`
    <div data-project-id="project-1">
      <button aria-label="Expand subgraph" onclick="this.dataset.expanded = 'true'"></button>
      <div class="react-flow__node selected">
        <div data-node-id="module-1" data-testid="module-node">
          <div data-testid="module-shape-layer">
            <svg data-testid="module-shape-svg"></svg>
          </div>
          <div data-testid="module-footer">Data Logging</div>
        </div>
      </div>
    </div>
  `);

  const graph = createGraphPage(page);
  const identity = {nodeLabel: 'Data Logging', projectId: 'project-1'};

  await expect(graph.nodeByIdentity(identity)).toHaveCount(1);
  await expect(graph.selectedNode(identity)).toHaveCount(1);
  await expect(
    graph.nodeByIdentity({nodeLabel: 'Data Logging', projectId: 'project-2'}),
  ).toHaveCount(0);
  await expect(graph.firstModuleNode('project-1')).toHaveAttribute(
    'data-node-id',
    'module-1',
  );

  await graph.expandFirstSubgraph('project-1');
  await expect(
    page.getByRole('button', {name: 'Expand subgraph'}),
  ).toHaveAttribute('data-expanded', 'true');
});

test('graph page prefers an instance ID and falls back to the first label', async ({
  page,
}) => {
  await page.setContent(`
    <div data-project-id="project-1">
      <div class="react-flow__node">
        <div data-testid="module-node" onclick="document.querySelectorAll('.react-flow__node').forEach((node) => node.classList.remove('selected')); this.parentElement.classList.add('selected')">
          <div data-testid="module-footer">
            <span>Data Logging</span>
            <span data-testid="module-instance-id">IID: 0x1</span>
          </div>
        </div>
      </div>
      <div class="react-flow__node">
        <div data-testid="module-node" onclick="document.querySelectorAll('.react-flow__node').forEach((node) => node.classList.remove('selected')); this.parentElement.classList.add('selected')">
          <div data-testid="module-footer">
            <span>Data Logging</span>
            <span data-testid="module-instance-id">IID: 0x2</span>
          </div>
        </div>
      </div>
    </div>
  `);

  const graph = createGraphPage(page);

  await graph.selectNode({
    nodeInstanceId: '0x2',
    nodeLabel: 'Data Logging',
    projectId: 'project-1',
  });
  await expect(
    graph.selectedNode({
      nodeInstanceId: '0x2',
      nodeLabel: 'Data Logging',
      projectId: 'project-1',
    }),
  ).toHaveCount(1);

  await graph.selectNode({
    nodeInstanceId: 'missing',
    nodeLabel: 'Data Logging',
    projectId: 'project-1',
  });
  await expect(
    graph.nodeByIdentity({
      nodeInstanceId: 'missing',
      nodeLabel: 'Data Logging',
      projectId: 'project-1',
    }),
  ).toHaveCount(0);
  await expect(
    graph.nodeByIdentity({
      nodeLabel: 'Data Logging',
      projectId: 'project-1',
    }),
  ).toHaveCount(2);
  await expect(
    graph.selectedNode({
      nodeInstanceId: '0x1',
      nodeLabel: 'Data Logging',
      projectId: 'project-1',
    }),
  ).toHaveCount(1);
});
