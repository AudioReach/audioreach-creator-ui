/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import {getGraphTestInputs, selectModuleNode} from '../commands/graph';
import {openFile, filterAndSelectUseCase} from '../commands/home';
import {testCase, testSession} from '../framework';

testSession(
  'EX-5 selects a module node by identity',
  testCase('module-selection'),
  async ({testSession}) => {
    const opened = await testSession.run(
      openFile({workspacePath: testSession.testData.validOpenProjectPath}),
    );
    expect(opened.ok).toBe(true);

    if (!opened.ok) {
      throw new Error(`open failed: ${opened.message}`);
    }

    await testSession.run(
      filterAndSelectUseCase({query: testSession.testData.useCaseQuery}),
    );
    await testSession.pages.graph.expandFirstSubgraph(opened.project.projectId);
    const {moduleLabel: nodeLabel} = getGraphTestInputs(testSession.testData);

    await testSession.run(
      selectModuleNode({
        nodeLabel,
        projectId: opened.project.projectId,
      }),
    );

    await expect(
      testSession.pages.graph.selectedNode({
        nodeLabel,
        projectId: opened.project.projectId,
      }),
    ).toBeVisible();
  },
);

testSession(
  'EX-6 selects a module by label and preferred instance ID',
  testCase('module-instance-selection'),
  async ({testSession}) => {
    const opened = await testSession.run(
      openFile({workspacePath: testSession.testData.validOpenProjectPath}),
    );
    expect(opened.ok).toBe(true);

    if (!opened.ok) {
      throw new Error(`open failed: ${opened.message}`);
    }

    await testSession.run(
      filterAndSelectUseCase({query: testSession.testData.useCaseQuery}),
    );
    await testSession.pages.graph.expandFirstSubgraph(opened.project.projectId);
    const {moduleInstanceId, moduleLabel} = getGraphTestInputs(
      testSession.testData,
    );
    if (moduleInstanceId === undefined) {
      throw new Error('EX-6 requires a module instance ID in test inputs');
    }

    await testSession.run(
      selectModuleNode({
        nodeInstanceId: moduleInstanceId,
        nodeLabel: moduleLabel,
        projectId: opened.project.projectId,
      }),
    );

    await expect(
      testSession.pages.graph.selectedNode({
        nodeLabel: moduleLabel,
        projectId: opened.project.projectId,
      }),
    ).toBeVisible();
  },
);
