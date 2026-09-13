/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Port} from '~entities/graph';

import {connectionRoleForPort} from '~features/usecase-visualizer/lib/connection-role';

describe('connectionRoleForPort', () => {
  const inputPort: Port = {id: 'input', portIoType: 'input'};
  const outputPort: Port = {id: 'output', portIoType: 'output'};
  const controlPort: Port = {id: 'control', portIoType: 'control'};

  it('maps ordinary and subsystem-boundary data ports to rendered roles', () => {
    expect(connectionRoleForPort('module', inputPort)).toBe('target');
    expect(connectionRoleForPort('module', outputPort)).toBe('source');
    expect(connectionRoleForPort('subsystem-boundary', inputPort)).toBe(
      'source',
    );
    expect(connectionRoleForPort('subsystem-boundary', outputPort)).toBe(
      'target',
    );
  });

  it('keeps controls direction-flexible without changing the domain port', () => {
    expect(connectionRoleForPort('subsystem-boundary', controlPort)).toBe(
      'either',
    );
    expect(controlPort.portIoType).toBe('control');
  });
});
