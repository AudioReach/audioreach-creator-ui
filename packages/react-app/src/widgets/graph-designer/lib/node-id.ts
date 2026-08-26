/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function subgraphNodeId(subgraphId: string): string {
  return `subgraph-${subgraphId}`;
}

export function subgraphProxyNodeId(subgraphId: string | number): string {
  return `subgraph-proxy-${subgraphId}`;
}

export function containerNodeId(
  containerId: string,
  subgraphId: string,
): string {
  return `container-${containerId}:${subgraphId}`;
}
