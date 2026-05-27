/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from 'react';

import {ReactFlow, ReactFlowProvider} from '@xyflow/react';

import type {UsecaseVisualizerProps} from '../model/visualizer.types';

export type {UsecaseVisualizerProps};

export const UsecaseVisualizer: FC<UsecaseVisualizerProps> = (_props) => (
  <ReactFlowProvider>
    <ReactFlow edges={[]} nodes={[]} />
  </ReactFlowProvider>
);
