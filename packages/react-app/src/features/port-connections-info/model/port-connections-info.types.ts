/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseDto} from '~entities/usecases';
import type {ConnectionType} from '~entities/usecases/model/usecase-component.dto';

export type ConnectionFilter = 'all' | 'sg' | 'dangling';

export interface ConnectionRow {
  connectionType: ConnectionType;
  isDangling: boolean;
  moduleId: string;
  moduleName: string;
  otherModuleSystemId: string;
  otherPortId: string;
  subgraphSystemId: string;
  systemId: string;
  usecases: UsecaseDto[];
}

export type PortConnectionsInfoState =
  | {status: 'closed'}
  | {componentSystemId: string; portSystemId: string; status: 'loading-links'}
  | {componentSystemId: string; portSystemId: string; status: 'loading-modules'}
  | {
      componentSystemId: string;
      portSystemId: string;
      rows: ConnectionRow[];
      status: 'ready';
    }
  | {
      componentSystemId: string;
      message: string;
      portSystemId: string;
      status: 'error';
    };
