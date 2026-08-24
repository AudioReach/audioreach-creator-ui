/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  createSubsystem,
  deleteSubsystem as deleteSubsystemApi,
  type MoveSubsystemComponentsRequestDto,
  type MoveSubsystemControlPortDto,
  type MoveSubsystemDataPortDto,
  type MoveSubsystemLinkDto,
  moveSubsystemComponents,
  type NormalizedMoveSubsystemComponentsResponseDto,
  patchSubsystem,
} from '~entities/subsystems';
import type {
  ControlLinkDto,
  DataLinkDto,
} from '~entities/usecases/model/usecase-component.dto';
import {showToast} from '~shared/controls/global-toaster';

import {withMutationLock} from '../model/edit-session-slice';
import type {
  Connection,
  LinkEndpoints,
  ModuleInstance,
  Subsystem,
  SubsystemPort,
} from '../model/graph-data-slice';
import type {GraphDesignerStore} from '../model/graph-designer-store';

import type {InnerActionOptions} from './module-operations';

export type MoveDestination =
  {createNew: true; name: string} | {subsystemId: string};

export interface SubsystemOperations {
  deleteSubsystem: (
    get: () => GraphDesignerStore,
    subsystemId: string,
  ) => Promise<boolean>;
  deleteSubsystemInner: (
    get: () => GraphDesignerStore,
    subsystemId: string,
    options?: InnerActionOptions,
  ) => Promise<boolean>;
  expandSubsystem: (
    get: () => GraphDesignerStore,
    subsystemId: string,
  ) => Promise<boolean>;
  moveToSubsystem: (
    get: () => GraphDesignerStore,
    nodeId: string,
    destination: MoveDestination,
  ) => Promise<boolean>;
  removeFromSubsystem: (
    get: () => GraphDesignerStore,
    nodeId: string,
    subsystemId: string,
  ) => Promise<boolean>;
  renameSubsystemNode: (
    get: () => GraphDesignerStore,
    subsystemId: string,
    newName: string,
  ) => Promise<void>;
}

export function canMoveToSubsystem(
  candidateId: string,
  targetSubsystemId: string,
): boolean {
  return candidateId !== targetSubsystemId;
}

function toConnection(
  link: MoveSubsystemLinkDto,
  connectionType: 'control' | 'data',
): Connection {
  return {
    connectionId: link.systemId,
    connectionType,
    fromModuleId: link.sourceSystemId,
    fromPortId: link.sourcePortSystemId,
    isDangling: false,
    toModuleId: link.destinationSystemId,
    toPortId: link.destinationPortSystemId,
  };
}

function toLinkEndpoints(connection: Connection): LinkEndpoints {
  return {
    destinationPortSystemId: connection.toPortId,
    destinationSystemId: connection.toModuleId,
    sourcePortSystemId: connection.fromPortId,
    sourceSystemId: connection.fromModuleId,
  };
}

function toControlLinkDto(link: MoveSubsystemLinkDto): ControlLinkDto {
  return {
    connectionType: 'MODULE_MODULE',
    destinationPortSystemId: link.destinationPortSystemId,
    destinationSystemId: link.destinationSystemId,
    isDangling: false,
    sourcePortSystemId: link.sourcePortSystemId,
    sourceSystemId: link.sourceSystemId,
    systemId: link.systemId,
  };
}

function toDataLinkDto(link: MoveSubsystemLinkDto): DataLinkDto {
  return {
    connectionType: 'MODULE_MODULE',
    destinationPortSystemId: link.destinationPortSystemId,
    destinationSystemId: link.destinationSystemId,
    isDangling: false,
    sourcePortSystemId: link.sourcePortSystemId,
    sourceSystemId: link.sourceSystemId,
    systemId: link.systemId,
  };
}

function upsertConnection(
  connections: Connection[],
  connection: Connection,
): Connection[] {
  return [
    ...connections.filter((c) => c.connectionId !== connection.connectionId),
    connection,
  ];
}

function toControlPort(port: MoveSubsystemControlPortDto): SubsystemPort {
  return {
    direction: 'input',
    portId: port.systemId,
    portName: port.controlPortName ?? port.name ?? port.systemId,
    portType: 'control',
  };
}

function toDataPort(port: MoveSubsystemDataPortDto): SubsystemPort {
  return {
    direction: port.portIoType === 'Input' ? 'input' : 'output',
    portId: port.systemId,
    portName: port.name,
    portType: 'data',
  };
}

export function createSubsystemOperations(
  set: StoreApi<GraphDesignerStore>['setState'],
  projectId: string,
): SubsystemOperations {
  async function deleteSubsystemInner(
    get: () => GraphDesignerStore,
    subsystemId: string,
    options?: InnerActionOptions,
  ): Promise<boolean> {
    const result = await deleteSubsystemApi(projectId, subsystemId);
    if (!result.success || !result.data) {
      if (!options?.suppressToast) {
        showToast(result.message ?? 'Failed to delete subsystem', 'danger');
      }
      return false;
    }

    set((s) => {
      if (!s.graphData) {
        return {};
      }
      const {[subsystemId]: _removed, ...remainingSubsystems} =
        s.graphData.subsystems;
      const subsystems = Object.fromEntries(
        Object.entries(remainingSubsystems).map(([id, subsystem]) => [
          id,
          {
            ...subsystem,
            childSubsystemIds: subsystem.childSubsystemIds.filter(
              (childId) => childId !== subsystemId,
            ),
          },
        ]),
      );
      return {
        graphData: {...s.graphData, subsystems},
      };
    });
    get().markDirty();
    return true;
  }

  function memberFieldFor(
    get: () => GraphDesignerStore,
    nodeId: string,
  ): 'childSubsystemIds' | 'subgraphs' {
    const {graphData} = get();
    if (graphData?.subgraphs[nodeId]) {
      return 'subgraphs';
    }
    if (graphData?.subsystems[nodeId]) {
      return 'childSubsystemIds';
    }
    throw new Error(
      `memberFieldFor: node ${nodeId} is neither a subgraph nor a subsystem`,
    );
  }

  function moveRequestForNode(
    get: () => GraphDesignerStore,
    nodeId: string,
    targetSubsystemSystemId: string | null,
  ): MoveSubsystemComponentsRequestDto {
    const memberField = memberFieldFor(get, nodeId);
    return memberField === 'subgraphs'
      ? {subgraphSystemIds: [nodeId], targetSubsystemSystemId}
      : {subsystemSystemIds: [nodeId], targetSubsystemSystemId};
  }

  function withMovedMembership(
    subsystem: Subsystem,
    request: MoveSubsystemComponentsRequestDto,
    response: NormalizedMoveSubsystemComponentsResponseDto,
    moduleInstances: Record<string, ModuleInstance>,
  ): Subsystem {
    const requestedSubgraphs = new Set(request.subgraphSystemIds ?? []);
    const requestedSubsystems = new Set(request.subsystemSystemIds ?? []);
    const movedSubgraphs = new Set(
      response.updatedModules
        .map((module) => moduleInstances[module.systemId]?.subgraphId)
        .filter(
          (subgraphId): subgraphId is string =>
            subgraphId !== undefined && requestedSubgraphs.has(subgraphId),
        ),
    );
    const movedSubsystems = new Set(
      response.updatedSubsystems
        .filter((ss) => requestedSubsystems.has(ss.systemId))
        .map((ss) => ss.systemId),
    );
    let subgraphs = subsystem.subgraphs.filter((id) => !movedSubgraphs.has(id));
    let childSubsystemIds = subsystem.childSubsystemIds.filter(
      (id) => !movedSubsystems.has(id),
    );

    if (subsystem.subsystemId === request.targetSubsystemSystemId) {
      subgraphs = Array.from(new Set([...subgraphs, ...movedSubgraphs]));
      childSubsystemIds = Array.from(
        new Set([...childSubsystemIds, ...movedSubsystems]),
      );
    }

    const movedSelf = response.updatedSubsystems.find(
      (ss) => ss.systemId === subsystem.subsystemId,
    );
    return {
      ...subsystem,
      childSubsystemIds,
      parentSubsystemId:
        movedSelf?.parentSystemId ?? subsystem.parentSubsystemId,
      subgraphs,
    };
  }

  function withPortChanges(
    subsystem: Subsystem,
    response: NormalizedMoveSubsystemComponentsResponseDto,
  ): Subsystem {
    const portChange = response.subsystemPortChanges.find(
      (change) => change.systemId === subsystem.subsystemId,
    );
    if (!portChange) {
      return subsystem;
    }

    const removedControlPorts = new Set(portChange.removedControlPorts);
    const removedDataPorts = new Set(portChange.removedDataPorts);
    return {
      ...subsystem,
      controlPorts: [
        ...subsystem.controlPorts.filter(
          (port) => !removedControlPorts.has(port.portId),
        ),
        ...portChange.addedControlPorts.map(toControlPort),
      ],
      dataPorts: [
        ...subsystem.dataPorts.filter(
          (port) => !removedDataPorts.has(port.portId),
        ),
        ...portChange.addedDataPorts.map(toDataPort),
      ],
    };
  }

  function applySubsystemMoveResponse(
    get: () => GraphDesignerStore,
    request: MoveSubsystemComponentsRequestDto,
    response: NormalizedMoveSubsystemComponentsResponseDto,
  ): void {
    const removedLinkIds = [
      ...response.removedControlLinks,
      ...response.removedDataLinks,
    ];
    const removedLinkIdSet = new Set(removedLinkIds);
    const deletedLinkEndpoints = (get().graphData?.connections ?? [])
      .filter((connection) => removedLinkIdSet.has(connection.connectionId))
      .map(toLinkEndpoints);

    set((s) => {
      if (!s.graphData) {
        return {};
      }

      let connections = s.graphData.connections.filter(
        (connection) =>
          !response.removedControlLinks.includes(connection.connectionId) &&
          !response.removedDataLinks.includes(connection.connectionId),
      );
      for (const link of response.addedDataLinks) {
        connections = upsertConnection(connections, toConnection(link, 'data'));
      }
      for (const link of response.addedControlLinks) {
        connections = upsertConnection(
          connections,
          toConnection(link, 'control'),
        );
      }

      const updatedSubsystems = new Map(
        response.updatedSubsystems.map((ss) => [ss.systemId, ss] as const),
      );
      const subsystems: Record<string, Subsystem> = {};
      for (const [id, subsystem] of Object.entries(s.graphData.subsystems)) {
        const next = withPortChanges(
          withMovedMembership(
            subsystem,
            request,
            response,
            s.graphData.moduleInstances,
          ),
          response,
        );
        const updated = updatedSubsystems.get(id);
        subsystems[id] = updated
          ? {...next, parentSubsystemId: updated.parentSystemId}
          : next;
      }

      const requestedSubsystems = new Set(request.subsystemSystemIds ?? []);
      const confirmedMovedSubsystems = response.updatedSubsystems.filter((ss) =>
        requestedSubsystems.has(ss.systemId),
      );
      for (const movedSubsystem of confirmedMovedSubsystems) {
        const movedSubsystemId = movedSubsystem.systemId;
        if (subsystems[movedSubsystemId]) {
          subsystems[movedSubsystemId] = {
            ...subsystems[movedSubsystemId],
            parentSubsystemId: movedSubsystem.parentSystemId,
          };
        }
      }

      return {
        graphData: {...s.graphData, connections, subsystems},
      };
    });
    get().pruneDeletedLinkBookkeeping(removedLinkIds);
    get().adjustSurvivingPortCounts(
      [
        ...response.addedDataLinks.map(toDataLinkDto),
        ...response.addedControlLinks.map(toControlLinkDto),
      ],
      deletedLinkEndpoints,
    );
    get().markDirty();
  }

  async function moveWithRequest(
    get: () => GraphDesignerStore,
    request: MoveSubsystemComponentsRequestDto,
    failureMessage: string,
  ): Promise<boolean> {
    const result = await moveSubsystemComponents(projectId, request);
    if (!result.success || !result.data) {
      showToast(result.message ?? failureMessage, 'danger');
      return false;
    }
    applySubsystemMoveResponse(get, request, result.data);
    return true;
  }

  return {
    deleteSubsystem: (get, subsystemId) =>
      withMutationLock(get, () => deleteSubsystemInner(get, subsystemId)),

    deleteSubsystemInner,

    expandSubsystem: (get, subsystemId) =>
      withMutationLock(get, async () => {
        const subsystem = get().graphData!.subsystems[subsystemId];
        const request: MoveSubsystemComponentsRequestDto = {
          subgraphSystemIds: subsystem.subgraphs,
          subsystemSystemIds: subsystem.childSubsystemIds,
          targetSubsystemSystemId: subsystem.parentSubsystemId ?? null,
        };
        const hasChildren =
          request.subgraphSystemIds!.length > 0 ||
          request.subsystemSystemIds!.length > 0;
        if (hasChildren) {
          const moved = await moveWithRequest(
            get,
            request,
            'Failed to expand subsystem',
          );
          if (!moved) {
            return false;
          }
        }
        return deleteSubsystemInner(get, subsystemId);
      }),

    moveToSubsystem: (get, nodeId, destination) =>
      withMutationLock(get, async () => {
        if ('subsystemId' in destination) {
          if (!canMoveToSubsystem(nodeId, destination.subsystemId)) {
            return false;
          }
          return moveWithRequest(
            get,
            moveRequestForNode(get, nodeId, destination.subsystemId),
            'Failed to move into subsystem',
          );
        }

        const createResult = await createSubsystem(projectId, {
          name: destination.name,
        });
        if (!createResult.success || !createResult.data) {
          showToast(
            createResult.message ?? 'Failed to create subsystem',
            'danger',
          );
          return false;
        }

        const newSubsystem = createResult.data;
        set((s) => ({
          graphData: s.graphData && {
            ...s.graphData,
            subsystems: {
              ...s.graphData.subsystems,
              [newSubsystem.systemId]: {
                childSubsystemIds: [],
                controlPorts: [],
                dataPorts: [],
                parentSubsystemId: newSubsystem.parentSystemId,
                subgraphs: [],
                subsystemId: newSubsystem.systemId,
                subsystemName: newSubsystem.name,
              },
            },
          },
        }));
        get().markDirty();

        return moveWithRequest(
          get,
          moveRequestForNode(get, nodeId, newSubsystem.systemId),
          'Failed to move into subsystem',
        );
      }),

    removeFromSubsystem: (get, nodeId, subsystemId) =>
      withMutationLock(get, async () => {
        const source = get().graphData!.subsystems[subsystemId];
        return moveWithRequest(
          get,
          moveRequestForNode(get, nodeId, source.parentSubsystemId ?? null),
          'Failed to remove from subsystem',
        );
      }),

    renameSubsystemNode: (get, subsystemId, newName) =>
      withMutationLock(get, async () => {
        const result = await patchSubsystem(projectId, subsystemId, {
          name: newName,
        });
        if (!result.success || !result.data) {
          showToast(result.message ?? 'Failed to rename subsystem', 'danger');
          return;
        }

        const subsystemName = result.data.name ?? newName;
        set((s) => ({
          graphData: s.graphData && {
            ...s.graphData,
            subsystems: {
              ...s.graphData.subsystems,
              [subsystemId]: {
                ...s.graphData.subsystems[subsystemId],
                subsystemName,
              },
            },
          },
        }));
        get().markDirty();
      }),
  };
}
