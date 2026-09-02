/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TestData} from '../../framework/test-context';

export type GraphTestInputs = {
  readonly moduleInstanceId?: string;
  readonly moduleLabel: string;
};

export function getGraphTestInputs(testData: TestData): GraphTestInputs {
  const graph = testData.customInputs.graph;
  if (typeof graph !== 'object' || graph === null || Array.isArray(graph)) {
    throw new Error('Graph test inputs must contain a graph object');
  }

  const moduleLabel = graph.moduleLabel;
  const moduleInstanceId = graph.moduleInstanceId;
  if (typeof moduleLabel !== 'string' || moduleLabel.trim() === '') {
    throw new Error('Graph test inputs require a non-empty moduleLabel');
  }
  if (
    moduleInstanceId !== undefined &&
    typeof moduleInstanceId !== 'string'
  ) {
    throw new Error('Graph test input moduleInstanceId must be a string');
  }

  return {moduleInstanceId, moduleLabel};
}
