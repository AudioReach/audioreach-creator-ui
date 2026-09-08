/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {EdgeKind, NodeKind} from '~entities/graph';

export interface SelectedNodeRef {
  id: string;
  nodeKind: NodeKind;
  systemId: string;
}

interface SelectedBackendEdgeRef {
  edgeKind: Extract<EdgeKind, 'control' | 'data'>;
  id: string;
  systemId: string;
}

interface SelectedProxyEdgeRef {
  edgeKind: Extract<EdgeKind, 'proxy-control' | 'proxy-data'>;
  id: string;
  systemId?: string;
}

export type SelectedEdgeRef = SelectedBackendEdgeRef | SelectedProxyEdgeRef;
