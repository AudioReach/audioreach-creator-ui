/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type AnyNode, NODE_KIND} from '~entities/graph';

import type {GraphDesignerStore} from '../model/graph-designer-store';

import type {InnerActionOptions} from './module-operations';

type DeleteHandler = (
  get: () => GraphDesignerStore,
  id: string,
) => Promise<boolean>;

type InnerDeleteHandler = (
  get: () => GraphDesignerStore,
  id: string,
  options?: InnerActionOptions,
) => Promise<boolean>;

export const DELETE_HANDLERS: Record<AnyNode['nodeKind'], DeleteHandler> = {
  container: (get, id) => get().deleteContainer(get, id),
  module: (get, id) => get().deleteModuleInstance(get, id),
  subgraph: (get, id) => get().deleteSubgraph(get, id),
  'subgraph-proxy': (get, id) => get().deleteSubgraph(get, id),
  subsystem: (get, id) => get().deleteSubsystem(get, id),
};

export const DELETE_HANDLERS_INNER: Record<
  AnyNode['nodeKind'],
  InnerDeleteHandler
> = {
  container: (get, id, options) => get().deleteContainerInner(get, id, options),
  module: (get, id, options) =>
    get().deleteModuleInstanceInner(get, id, options),
  subgraph: (get, id, options) => get().deleteSubgraphInner(get, id, options),
  'subgraph-proxy': (get, id, options) =>
    get().deleteSubgraphInner(get, id, options),
  subsystem: (get, id, options) => get().deleteSubsystemInner(get, id, options),
};

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function resolveGraphDesignerNodeId(target: {node: AnyNode}): string {
  const systemId = optionalString(target.node.meta?.systemId);
  if (systemId) {
    return systemId;
  }
  switch (target.node.nodeKind) {
    case NODE_KIND.CONTAINER:
      return optionalString(target.node.meta?.containerSystemId) ?? target.node.id;
    case NODE_KIND.MODULE:
      return target.node.id;
    case NODE_KIND.SUBGRAPH:
    case NODE_KIND.SUBGRAPH_PROXY:
      return optionalString(target.node.meta?.subgraphSystemId) ?? target.node.id;
    case NODE_KIND.SUBSYSTEM:
      return target.node.subsystemId;
  }
}
