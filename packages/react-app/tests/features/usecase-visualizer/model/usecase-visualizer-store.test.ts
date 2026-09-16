/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';

describe('visualizer connection store', () => {
  it.each([
    [
      'boundary source first',
      'ss-1',
      'in-1',
      'source',
      'm6',
      'm6-in',
      'target',
    ],
    ['module target first', 'm6', 'm6-in', 'target', 'ss-1', 'in-1', 'source'],
  ])(
    'orders data payloads by rendered role when %s',
    (
      _name,
      firstNodeId,
      firstPortId,
      firstRole,
      secondNodeId,
      secondPortId,
      secondRole,
    ) => {
      const onEdgeConnected = jest.fn();
      const store = createVisualizerStore();
      store.getState().setEventHandlers({onEdgeConnected});

      store
        .getState()
        .startConnection(
          firstNodeId,
          {id: firstPortId, portIoType: 'input'},
          'normal',
          firstRole as 'source' | 'target',
        );
      store
        .getState()
        .completeConnection(
          secondNodeId,
          {id: secondPortId, portIoType: 'input'},
          secondRole as 'source' | 'target',
        );

      expect(onEdgeConnected).toHaveBeenCalledWith({
        edgeKind: 'data',
        edgeMode: 'normal',
        sourceNodeId: 'ss-1',
        sourcePortId: 'in-1',
        targetNodeId: 'm6',
        targetPortId: 'm6-in',
      });
    },
  );

  it('orders module output to boundary output by rendered roles', () => {
    const onEdgeConnected = jest.fn();
    const store = createVisualizerStore();
    store.getState().setEventHandlers({onEdgeConnected});

    store
      .getState()
      .startConnection(
        'ss-1',
        {id: 'out-1', portIoType: 'output'},
        'normal',
        'target',
      );
    store
      .getState()
      .completeConnection('m6', {id: 'm6-out', portIoType: 'output'}, 'source');

    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'data',
      edgeMode: 'normal',
      sourceNodeId: 'm6',
      sourcePortId: 'm6-out',
      targetNodeId: 'ss-1',
      targetPortId: 'out-1',
    });
  });

  it('rejects equal rendered data roles and preserves domain port directions', () => {
    const onEdgeConnected = jest.fn();
    const store = createVisualizerStore();
    const sourcePort = {id: 'in-1', portIoType: 'input' as const};
    const targetPort = {id: 'in-2', portIoType: 'input' as const};
    store.getState().setEventHandlers({onEdgeConnected});

    store.getState().startConnection('ss-1', sourcePort, 'normal', 'source');
    store.getState().completeConnection('ss-2', targetPort, 'source');

    expect(onEdgeConnected).not.toHaveBeenCalled();
    expect(sourcePort.portIoType).toBe('input');
    expect(targetPort.portIoType).toBe('input');
  });

  it('rejects data completion when either endpoint role is either', () => {
    const onEdgeConnected = jest.fn();
    const store = createVisualizerStore();
    store.getState().setEventHandlers({onEdgeConnected});

    store
      .getState()
      .startConnection(
        'm1',
        {id: 'input-1', portIoType: 'input'},
        'normal',
        'either',
      );
    store
      .getState()
      .completeConnection('m2', {id: 'input-2', portIoType: 'input'}, 'target');

    expect(onEdgeConnected).not.toHaveBeenCalled();
  });

  it('keeps controls direction-flexible and retains click order', () => {
    const onEdgeConnected = jest.fn();
    const store = createVisualizerStore();
    store.getState().setEventHandlers({onEdgeConnected});

    store
      .getState()
      .startConnection(
        'm1',
        {id: 'ctl-1', portIoType: 'control'},
        'normal',
        'either',
      );
    store
      .getState()
      .completeConnection(
        'ss-1',
        {id: 'ctl-2', portIoType: 'control'},
        'either',
      );

    expect(onEdgeConnected).toHaveBeenCalledWith({
      edgeKind: 'control',
      edgeMode: 'normal',
      sourceNodeId: 'm1',
      sourcePortId: 'ctl-1',
      targetNodeId: 'ss-1',
      targetPortId: 'ctl-2',
    });
  });
});
