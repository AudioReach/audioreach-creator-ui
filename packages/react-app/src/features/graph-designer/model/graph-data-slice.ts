/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {getUsecaseComponents} from '~entities/usecases/api/usecases-api';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffState = 'added' | 'removed' | 'modified' | 'common';

export interface Port {
  direction: 'input' | 'output';
  isStatic: boolean;
  portId: string;
  portName: string;
  portType: 'control' | 'data';
}

export interface ModuleInstance {
  containerId: string;
  diffChangedFields?: string[];
  diffState?: DiffState;
  displayName: string;
  inputPorts: Port[];
  moduleId: string;
  moduleInstanceId: string;
  moduleName: string;
  moduleType: string;
  outputPorts: Port[];
  position: {x: number; y: number};
  subgraphId: string;
}

export interface Connection {
  connectionId: string;
  diffState?: DiffState;
  fromModuleId: string;
  fromPortId: string;
  toModuleId: string;
  toPortId: string;
}

export interface Subgraph {
  containers: string[];
  diffState?: DiffState;
  subgraphId: string;
  subgraphName: string;
  subgraphType: string;
}

export interface Container {
  containerId: string;
  containerName: string;
  moduleInstances: string[];
  subgraphId: string;
}

export interface Subsystem {
  subgraphs: string[];
  subsystemId: string;
  subsystemName: string;
}

export interface UsecaseGraphData {
  connections: Connection[];
  containers: Record<string, Container>;
  moduleInstances: Record<string, ModuleInstance>;
  selectedUsecases: string[];
  subgraphs: Record<string, Subgraph>;
  subsystems: Record<string, Subsystem>;
}

export interface GraphDataSlice {
  clearGraphData: () => void;
  graphData: UsecaseGraphData | null;
  graphDataStatus: SliceStatus;
  isDirty: boolean;
  loadGraphData: (
    usecases: string[],
    options?: {stagingSessionId?: string},
  ) => Promise<void>;
  markClean: () => void;
  markDirty: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDiffState(changeType: string): DiffState | undefined {
  switch (changeType) {
    case 'CREATE':
      return 'added';
    case 'DELETE':
      return 'removed';
    case 'UPDATE':
      return 'modified';
    case 'NONE':
      return 'common';
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the graph-data slice for composing into a tab store.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @returns The initial state and actions for the graph-data slice.
 */
export function createGraphDataSlice<S extends GraphDataSlice>(
  set: StoreApi<S>['setState'],
  projectId: string,
): GraphDataSlice {
  return {
    clearGraphData: () => {
      logger.debug('graphDataSlice: clearGraphData', {
        action: 'clearGraphData',
        component: 'graphDataSlice',
      });
      set({
        graphData: null,
        graphDataStatus: 'uninitialized',
        isDirty: false,
      } as Partial<S>);
    },

    graphData: null,

    graphDataStatus: 'uninitialized',

    isDirty: false,

    loadGraphData: async (
      usecases: string[],
      _options?: {stagingSessionId?: string},
    ) => {
      logger.debug('graphDataSlice: loadGraphData — loading', {
        action: 'loadGraphData',
        component: 'graphDataSlice',
      });

      set({graphDataStatus: 'loading'} as unknown as Partial<S>);

      try {
        const result = await getUsecaseComponents(projectId, usecases);

        if (!result.success || !result.data) {
          logger.error('graphDataSlice: loadGraphData — API error', {
            action: 'loadGraphData',
            component: 'graphDataSlice',
            error: result.message,
          });
          set({graphDataStatus: 'error'} as unknown as Partial<S>);
          return;
        }

        const dto = result.data;
        const spfModules = dto.spfModules ?? [];
        const subsystemDtos = dto.subsystems ?? [];

        // Build numeric id → systemId lookup used when mapping connections.
        const numericIdToSystemId = new Map<number, string>();
        for (const m of spfModules) {
          numericIdToSystemId.set(m.id, m.systemId);
        }
        for (const ss of subsystemDtos) {
          numericIdToSystemId.set(ss.id, ss.systemId);
        }

        // moduleInstances
        const moduleInstances: Record<string, ModuleInstance> = {};
        for (const m of spfModules) {
          const inputPorts: Port[] = (m.dataPorts ?? [])
            .filter((p) => p.portIoType === 'Input')
            .map((p) => ({
              direction: 'input' as const,
              isStatic: p.portType === 'Static',
              portId: String(p.id),
              portName: p.name,
              portType: 'data' as const,
            }));
          const controlPorts: Port[] = (m.controlPorts ?? []).map((p) => ({
            direction: 'input' as const,
            isStatic: p.portType === 'Static',
            portId: String(p.id),
            portName: p.controlPortName,
            portType: 'control' as const,
          }));
          const outputPorts: Port[] = (m.dataPorts ?? [])
            .filter((p) => p.portIoType === 'Output')
            .map((p) => ({
              direction: 'output' as const,
              isStatic: p.portType === 'Static',
              portId: String(p.id),
              portName: p.name,
              portType: 'data' as const,
            }));

          const instance: ModuleInstance = {
            containerId: String(m.containerId),
            displayName: m.alias || m.name,
            inputPorts: [...inputPorts, ...controlPorts],
            moduleId: String(m.moduleId),
            moduleInstanceId: m.systemId,
            moduleName: m.name,
            moduleType: '',
            outputPorts,
            position: {x: 0, y: 0},
            subgraphId: String(m.subgraphId),
          };
          const diffState = toDiffState(m.changeInfo.changeType);
          if (diffState) {
            instance.diffState = diffState;
          }
          moduleInstances[m.systemId] = instance;
        }

        // containers — derived by grouping modules by containerId
        const containers: Record<string, Container> = {};
        for (const m of spfModules) {
          const cId = String(m.containerId);
          if (!(cId in containers)) {
            containers[cId] = {
              containerId: cId,
              containerName: `Container ${m.containerId}`,
              moduleInstances: [],
              subgraphId: String(m.subgraphId),
            };
          }
          containers[cId].moduleInstances.push(m.systemId);
        }

        // subgraphs — derived by grouping containers by subgraphId
        const subgraphs: Record<string, Subgraph> = {};
        for (const m of spfModules) {
          const sgId = String(m.subgraphId);
          if (!(sgId in subgraphs)) {
            subgraphs[sgId] = {
              containers: [],
              subgraphId: sgId,
              subgraphName: `Subgraph ${m.subgraphId}`,
              subgraphType: '',
            };
          }
          const sg = subgraphs[sgId];
          const cId = String(m.containerId);
          if (!sg.containers.includes(cId)) {
            sg.containers.push(cId);
          }
          const diffState = toDiffState(m.changeInfo.changeType);
          if (diffState && !sg.diffState) {
            sg.diffState = diffState;
          }
        }

        // subsystems
        const subsystems: Record<string, Subsystem> = {};
        for (const ss of subsystemDtos) {
          subsystems[ss.systemId] = {
            subgraphs: [],
            subsystemId: ss.systemId,
            subsystemName: ss.name,
          };
        }

        // connections — data links + control links combined
        const allLinks = [...dto.dataLinks, ...dto.controlLinks];
        const connections: Connection[] = allLinks.map((link) => {
          const conn: Connection = {
            connectionId: link.systemId,
            fromModuleId:
              numericIdToSystemId.get(link.sourceId) ?? String(link.sourceId),
            fromPortId: String(link.sourcePortId),
            toModuleId:
              numericIdToSystemId.get(link.destinationId) ??
              String(link.destinationId),
            toPortId: String(link.destinationPortId),
          };
          const diffState = toDiffState(link.changeInfo.changeType);
          if (diffState) {
            conn.diffState = diffState;
          }
          return conn;
        });

        const graphData: UsecaseGraphData = {
          connections,
          containers,
          moduleInstances,
          selectedUsecases: usecases,
          subgraphs,
          subsystems,
        };

        set({
          graphData,
          graphDataStatus: 'ready',
        } as unknown as Partial<S>);

        logger.debug('graphDataSlice: loadGraphData — ready', {
          action: 'loadGraphData',
          component: 'graphDataSlice',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('graphDataSlice: loadGraphData — failed', {
          action: 'loadGraphData',
          component: 'graphDataSlice',
          error: errorMessage,
        });
        set({graphDataStatus: 'error'} as unknown as Partial<S>);
      }
    },

    markClean: () => {
      logger.debug('graphDataSlice: markClean', {
        action: 'markClean',
        component: 'graphDataSlice',
      });
      set({isDirty: false} as Partial<S>);
    },

    markDirty: () => {
      logger.debug('graphDataSlice: markDirty', {
        action: 'markDirty',
        component: 'graphDataSlice',
      });
      set({isDirty: true} as Partial<S>);
    },
  };
}
