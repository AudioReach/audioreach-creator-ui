/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {HandleType} from '@xyflow/react';

import {PORT_IO_TYPE, type Port} from '~entities/graph';

export type ConnectionEndpointRole = HandleType | 'either';

export function connectionRoleForPort(
  nodeType: string | undefined,
  port: Port,
): ConnectionEndpointRole {
  if (port.portIoType === PORT_IO_TYPE.CONTROL) {
    return 'either';
  }

  const ordinaryRole =
    port.portIoType === PORT_IO_TYPE.INPUT ? 'target' : 'source';
  if (nodeType === 'subsystem-boundary') {
    return ordinaryRole === 'source' ? 'target' : 'source';
  }
  return ordinaryRole;
}
