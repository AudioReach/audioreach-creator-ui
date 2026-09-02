/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CommandFactory} from '../../framework/command';

export const selectModuleNode: CommandFactory<
  {
    readonly nodeInstanceId?: string;
    readonly nodeLabel: string;
    readonly projectId: string;
  },
  void
> = (input) => ({
  execute: async (context) => {
    await context.pages.graph.selectNode(input);
  },
  id: 'graph.select-module-node',
});
