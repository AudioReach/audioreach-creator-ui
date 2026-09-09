/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  EDGE_KIND,
  NODE_KIND,
  type ProxyControlLink,
  type ProxyDataLink,
} from '~entities/graph';
import type {
  SelectedEdgeRef,
  SelectedNodeRef,
} from '~features/usecase-visualizer';
import {buildPropertyGroups} from '~widgets/properties-panel/lib/selection-groups';

import {makeGraphData} from '../ui/entity-cards/test-graph-data';

const standardProxy: ProxyDataLink = {
  edgeKind: EDGE_KIND.PROXY_DATA,
  id: 'proxy-dl-1',
  kind: 'standard',
  realConnectionIds: ['dl-1'],
  sourceNodeId: 'mod-1',
  sourcePortId: 'out-1',
  targetNodeId: 'mod-2',
  targetPortId: 'in-2',
};

const subsystemProxy: ProxyDataLink = {
  edgeKind: EDGE_KIND.PROXY_DATA,
  id: 'proxy-subsystem-dl-1',
  kind: 'subsystem',
  realConnectionIds: ['dl-subsystem'],
  sourceNodeId: 'ss-1',
  sourcePortId: 'ss-out-1',
  targetNodeId: 'mod-2',
  targetPortId: 'in-2',
};

const proxyControl: ProxyControlLink = {
  edgeKind: EDGE_KIND.PROXY_CONTROL,
  id: 'proxy-cl-1',
  realConnectionIds: ['cl-1'],
  sourceNodeId: 'mod-1',
  sourcePortId: 'ctl-1',
  targetNodeId: 'mod-2',
  targetPortId: 'ctl-2',
};

function selectedNode(
  id: string,
  nodeKind: SelectedNodeRef['nodeKind'],
): SelectedNodeRef {
  return {id, nodeKind, systemId: id};
}

function selectedEdge(
  id: string,
  edgeKind: SelectedEdgeRef['edgeKind'],
  systemId = id,
): SelectedEdgeRef {
  return {edgeKind, id, systemId};
}

describe('selection groups', () => {
  it('builds supported property groups in the required order', () => {
    const graphData = makeGraphData();
    graphData.connections.push({
      connectionId: 'dl-subsystem',
      connectionType: EDGE_KIND.DATA,
      fromModuleId: 'ss-1',
      fromPortId: 'ss-out-1',
      isDangling: false,
      toModuleId: 'mod-2',
      toPortId: 'in-2',
    });

    const groups = buildPropertyGroups({
      graphData,
      selectedEdges: [
        selectedEdge('dl-1', EDGE_KIND.DATA),
        selectedEdge('cl-1', EDGE_KIND.CONTROL),
        selectedEdge('proxy-dl-1', EDGE_KIND.PROXY_DATA, 'proxy-dl-1'),
        selectedEdge(
          'proxy-subsystem-dl-1',
          EDGE_KIND.PROXY_DATA,
          'dl-subsystem',
        ),
        selectedEdge('dl-subsystem', EDGE_KIND.DATA),
        selectedEdge('proxy-cl-1', EDGE_KIND.PROXY_CONTROL, 'proxy-cl-1'),
      ],
      selectedNodes: [
        selectedNode('sg-1', NODE_KIND.SUBGRAPH),
        selectedNode('cnt-1', NODE_KIND.CONTAINER),
        selectedNode('mod-2', NODE_KIND.MODULE),
        selectedNode('mod-1', NODE_KIND.MODULE),
        selectedNode('ss-1', NODE_KIND.SUBSYSTEM),
      ],
      virtualControlLinks: [proxyControl],
      virtualDataLinks: [standardProxy, subsystemProxy],
    });

    expect(groups.map((group) => group.type)).toEqual([
      'subgraphs',
      'containers',
      'modules',
      'subsystems',
      'dataLinks',
      'controlLinks',
      'virtualDataLinks',
      'virtualControlLinks',
    ]);
    expect(
      groups
        .find((group) => group.type === 'modules')
        ?.items.map((item) => item.systemId),
    ).toEqual(['mod-2', 'mod-1']);
    expect(
      groups.find((group) => group.type === 'virtualDataLinks')?.items,
    ).toEqual([expect.objectContaining({proxyDataLink: standardProxy})]);
    expect(
      groups.find((group) => group.type === 'virtualDataLinks')?.items,
    ).not.toContainEqual(
      expect.objectContaining({proxyDataLink: subsystemProxy}),
    );
    expect(
      groups.find((group) => group.type === 'dataLinks')?.items,
    ).toContainEqual(expect.objectContaining({systemId: 'dl-subsystem'}));
  });

  it('omits empty and unresolved groups', () => {
    expect(
      buildPropertyGroups({
        graphData: makeGraphData(),
        selectedEdges: [selectedEdge('missing-link', EDGE_KIND.DATA)],
        selectedNodes: [selectedNode('missing-module', NODE_KIND.MODULE)],
        virtualControlLinks: [],
        virtualDataLinks: [],
      }),
    ).toEqual([]);
  });
});
