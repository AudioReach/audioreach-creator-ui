/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {SubsystemNode as SubsystemNodeData} from '~entities/graph';
import {PortHandles} from '~features/usecase-visualizer/ui/node-types/port-handles';
import {SubsystemBoundaryNode} from '~features/usecase-visualizer/ui/node-types/subsystem-boundary-node';

import {makeSubsystemNodeProps} from './node-props';

jest.mock('@xyflow/react', () => {
  const actual = jest.requireActual('@xyflow/react');
  return {
    ...actual,
    Handle: ({
      className,
      'data-connection-source': dataConnectionSource,
      'data-port-id': dataPortId,
      id,
      isConnectable,
      position,
      style,
      type,
    }: {
      className?: string;
      dataConnectionSource?: boolean;
      dataPortId?: string;
      id: string;
      isConnectable?: boolean;
      position: string;
      style?: object;
      type: string;
    }) => (
      <div
        className={className}
        data-connectable={isConnectable}
        data-connection-source={dataConnectionSource}
        data-handle-type={type}
        data-handleid={id}
        data-handlepos={position}
        data-port-id={dataPortId}
        style={style}
      />
    ),
  };
});

function makeBoundary(): SubsystemNodeData {
  return {
    height: 240,
    id: 'ss-1',
    label: 'Subsystem boundary',
    nodeKind: 'subsystem',
    ports: [
      {id: 'in-1', portIoType: 'input'},
      {id: 'out-1', portIoType: 'output'},
      {id: 'ctrl-1', portIoType: 'control'},
    ],
    subsystemId: 'ss-1',
    width: 360,
    x: 0,
    y: 0,
  };
}

function renderBoundary(node: SubsystemNodeData = makeBoundary()) {
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={createVisualizerStore()}>
        <SubsystemBoundaryNode {...makeSubsystemNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('SubsystemBoundaryNode', () => {
  it('renders private data and colocated control handles', () => {
    const {container} = renderBoundary();

    const input = container.querySelector('[data-handleid="Data:in-1"]');
    const output = container.querySelector('[data-handleid="Data:out-1"]');
    const controlSource = container.querySelector(
      '[data-handleid="Control:ctrl-1-source"]',
    );
    const controlTarget = container.querySelector(
      '[data-handleid="Control:ctrl-1-target"]',
    );

    expect(input).toHaveAttribute('data-handle-type', 'source');
    expect(input).toHaveAttribute('data-handlepos', 'left');
    expect(input).toHaveClass('port-handle');
    expect(output).toHaveAttribute('data-handle-type', 'target');
    expect(output).toHaveAttribute('data-handlepos', 'right');
    expect(output).toHaveClass('port-handle');
    expect(controlSource).toHaveAttribute('data-handle-type', 'source');
    expect(controlSource).toHaveAttribute('data-handlepos', 'top');
    expect(controlSource).toHaveClass('port-handle');
    expect(controlTarget).toHaveAttribute('data-handle-type', 'target');
    expect(controlTarget).toHaveAttribute('data-handlepos', 'top');
    expect(controlTarget).toHaveClass('port-handle');
    expect(controlSource?.getAttribute('style')).toBe(
      controlTarget?.getAttribute('style'),
    );
  });

  it('keeps ordinary handle presentation behavior after extraction', () => {
    const port = {
      activeLinks: 1,
      id: 'out-1',
      locked: true,
      portIoType: 'output' as const,
      portStatus: 'warning',
      totalLinks: 2,
    };
    const store = createVisualizerStore();
    store.getState().startConnection('module-1', port, 'normal', 'source');
    const {container} = render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <PortHandles
            node={{
              height: 240,
              id: 'module-1',
              ports: [port],
              width: 360,
            }}
            showLinkCountColor
          />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );

    const handle = container.querySelector('[data-handleid="Data:out-1"]');
    expect(handle).toHaveClass(
      'port-handle',
      '!bg-[var(--color-background-support-neutral-medium)]',
      'port-status-warning',
      'port-handle-connection-source',
    );
    expect(handle).toHaveAttribute('data-connection-source', 'true');
    expect(handle).toHaveAttribute('data-connectable', 'false');
  });
});
