/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock(
  '~features/graph-designer/ui/module-enable-overlay/module-enable-overlay',
  () => ({
    ModuleEnableOverlay: ({moduleInstanceId}: {moduleInstanceId: string}) => (
      <div
        data-moduleinstanceid={moduleInstanceId}
        data-testid="mock-module-enable-overlay"
      />
    ),
  }),
);

jest.mock(
  '~features/graph-designer/ui/subgraph-header/subgraph-header',
  () => ({
    SubgraphHeader: ({subgraphId}: {subgraphId: string}) => (
      <div data-subgraphid={subgraphId} data-testid="mock-subgraph-header" />
    ),
  }),
);

import {render} from '@testing-library/react';

import type {
  ContainerNode,
  ModuleNode,
  SubgraphNode,
  SubsystemNode,
} from '~entities/graph';
import {renderNodeContent} from '~widgets/graph-designer/lib/render-node-content';

function makeModuleNode(overrides?: Partial<ModuleNode>): ModuleNode {
  return {
    height: 60,
    id: 'inst-1',
    label: 'Module',
    moduleId: 200,
    moduleType: '',
    nodeKind: 'module',
    ports: [],
    width: 120,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeSubgraphNode(overrides?: Partial<SubgraphNode>): SubgraphNode {
  return {
    height: 60,
    id: 'subgraph-sg-1',
    label: 'Subgraph',
    nodeKind: 'subgraph',
    subgraphId: 1,
    width: 120,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeContainerNode(overrides?: Partial<ContainerNode>): ContainerNode {
  return {
    containerId: 1,
    height: 60,
    id: 'container-1',
    label: 'Container',
    nodeKind: 'container',
    width: 120,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function makeSubsystemNode(overrides?: Partial<SubsystemNode>): SubsystemNode {
  return {
    height: 60,
    id: 'subsystem-1',
    label: 'Subsystem',
    nodeKind: 'subsystem',
    ports: [],
    subsystemId: 'ss-1',
    width: 120,
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe('renderNodeContent — module node', () => {
  it('returns a top-right coreOverride wrapping ModuleEnableOverlay keyed by node.id', () => {
    const node = makeModuleNode({id: 'inst-42', moduleId: 999});
    const override = renderNodeContent(node);

    expect(override?.coreOverrides).toHaveLength(1);
    expect(override?.coreOverrides?.[0]!.position).toBe('top-right');

    const {getByTestId} = render(<>{override?.coreOverrides?.[0]!.content}</>);
    expect(getByTestId('mock-module-enable-overlay')).toHaveAttribute(
      'data-moduleinstanceid',
      'inst-42',
    );
  });
});

describe('renderNodeContent — subgraph node', () => {
  it('returns a header wrapping SubgraphHeader keyed by String(node.subgraphId)', () => {
    const node = makeSubgraphNode({id: 'subgraph-sg-7', subgraphId: 7});
    const override = renderNodeContent(node);

    expect(override?.header).toBeDefined();

    const {getByTestId} = render(<>{override?.header}</>);
    expect(getByTestId('mock-subgraph-header')).toHaveAttribute(
      'data-subgraphid',
      '7',
    );
  });
});

describe('renderNodeContent — other node kinds', () => {
  it('returns null for a container node', () => {
    expect(renderNodeContent(makeContainerNode())).toBeNull();
  });

  it('returns null for a subsystem node', () => {
    expect(renderNodeContent(makeSubsystemNode())).toBeNull();
  });
});
