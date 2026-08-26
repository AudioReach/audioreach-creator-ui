/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {CkvDto, TagInfoDto} from '~entities/spf-module-data';
import type {SubgraphPairResponseDto} from '~entities/subgraph-definitions/model/subgraph-response.dto';
import {getSubgraphsByIds, getUsecaseComponents} from '~entities/usecases';
import type {
  ComponentCollectionDto,
  ControlLinkDto,
  DataLinkDto,
  SpfModuleDto,
  SubsystemDto,
} from '~entities/usecases/model/usecase-component.dto';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

import type {EditSessionSlice} from './edit-session-slice';
import type {ModuleListSlice} from './module-list-slice';

export type DiffState = 'added' | 'removed' | 'modified' | 'common';

export interface Port {
  direction: 'input' | 'output';
  isStatic: boolean;
  portId: string;
  portName: string;
  portType: 'control' | 'data';
  totalLinksAtPort: number;
}

export interface ModuleInstance {
  ckvs?: CkvDto[];
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
  tags?: TagInfoDto[];
}

export interface Connection {
  connectionId: string;
  connectionType: 'control' | 'data';
  diffState?: DiffState;
  fromModuleId: string;
  fromPortId: string;
  isDangling: boolean;
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
  moduleInstances: string[];
  subgraphId: string;
}

/**
 * The "deleted" bucket's contract for `applyComponentCollection`/
 * `applyDeletedCollection`/`pruneDeletedLinkBookkeeping` — ids only, never
 * full DTOs, matching the backend's actual deleted-entities responses (e.g.
 * `RemoveSpfModuleResponseDto.deleted`). Omits `containers` — a container
 * has no session-local map of its own and disappears automatically once
 * `recomputeContainersAndSubgraphs` re-derives from surviving modules, so
 * its own id needs no separate prune.
 */
export interface DeletedIdsCollection {
  controlLinks: string[];
  dataLinks: string[];
  spfModules: string[];
  subgraphs?: string[];
  subsystems?: string[];
}

export interface LinkEndpoints {
  destinationPortSystemId: string;
  destinationSystemId: string;
  sourcePortSystemId: string;
  sourceSystemId: string;
}

export interface SubsystemPort {
  direction: 'input' | 'output';
  portId: string;
  portName: string;
  portType: 'control' | 'data';
}

export interface Subsystem {
  childSubsystemIds: string[];
  controlPorts: SubsystemPort[];
  dataPorts: SubsystemPort[];
  parentSubsystemId?: string;
  subgraphs: string[];
  /** Always a stringified integer from the backend (e.g. `'42'`). */
  subsystemId: string;
  subsystemName: string;
}

export interface UsecaseGraphData {
  connections: Connection[];
  /** Keyed by the container's systemId (`ContainerDto.systemId`). */
  containers: Record<string, Container>;
  /** Keyed by the module's systemId (`SpfModuleDto.systemId`). */
  moduleInstances: Record<string, ModuleInstance>;
  selectedUsecases: string[];
  /**
   * Keyed by the subgraph's systemId, i.e. subgraphSystemId
   * (`SpfModuleDto.subgraphId`).
   */
  subgraphs: Record<string, Subgraph>;
  /** Keyed by the subsystem's systemId (`SubsystemDto.systemId`). */
  subsystems: Record<string, Subsystem>;
}

export interface GraphDataSlice {
  adjustSurvivingPortCounts: (
    addedLinks: Array<ControlLinkDto | DataLinkDto>,
    deletedLinkEndpoints: LinkEndpoints[],
  ) => void;
  applyAddedCollection: (collection: ComponentCollectionDto) => void;
  applyComponentCollection: (collections: {
    added: ComponentCollectionDto;
    deleted: DeletedIdsCollection;
    updated: ComponentCollectionDto;
  }) => Promise<void>;
  applyDeletedCollection: (collection: DeletedIdsCollection) => void;
  clearGraphData: () => void;
  graphData: UsecaseGraphData | null;
  graphDataError: string | null;
  graphDataStatus: SliceStatus;
  initializeEmptyGraphData: () => void;
  isDirty: boolean;
  loadGraphData: (
    usecases: string[],
    options?: {stagingSessionId?: string},
  ) => Promise<void>;
  markClean: () => void;
  markDirty: () => void;
  pruneDeletedLinkBookkeeping: (deletedLinkIds: string[]) => void;
  recomputeContainersAndSubgraphs: () => Promise<void>;
}

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

/**
 * Groups surviving modules into their containers/subgraphs. Shared by
 * `loadGraphData` (full snapshot) and `recomputeContainersAndSubgraphs`
 * (incremental reconciliation, design.md §6.3) — both
 * drive it from the same already-mapped `ModuleInstance` records rather
 * than each keeping its own copy of the grouping loop.
 *
 * `existingSubgraphs`, when passed, carries forward `subgraphName`/
 * `subgraphType` for a subgraph that already existed — real names fetched
 * via `getSubgraphsByIds` must survive a later incremental recompute rather
 * than resetting to the `Subgraph ${id}` placeholder.
 */
function deriveContainersAndSubgraphs(
  moduleInstances: Record<string, ModuleInstance>,
  existingSubgraphs?: Record<string, Subgraph>,
): {
  containers: Record<string, Container>;
  newSubgraphs: Record<string, Subgraph>;
  subgraphs: Record<string, Subgraph>;
} {
  const containers: Record<string, Container> = {};
  const subgraphs: Record<string, Subgraph> = {};
  const newSubgraphs: Record<string, Subgraph> = {};

  for (const [moduleInstanceId, m] of Object.entries(moduleInstances)) {
    if (!(m.containerId in containers)) {
      containers[m.containerId] = {
        containerId: m.containerId,
        moduleInstances: [],
        subgraphId: m.subgraphId,
      };
    }
    containers[m.containerId].moduleInstances.push(moduleInstanceId);

    if (!(m.subgraphId in subgraphs)) {
      const existing = existingSubgraphs?.[m.subgraphId];
      const sg: Subgraph = {
        containers: [],
        subgraphId: m.subgraphId,
        subgraphName: existing?.subgraphName ?? `Subgraph ${m.subgraphId}`,
        subgraphType: existing?.subgraphType ?? '',
      };
      subgraphs[m.subgraphId] = sg;
      if (!existing) {
        newSubgraphs[m.subgraphId] = sg;
      }
    }
    const sg = subgraphs[m.subgraphId];
    if (!sg.containers.includes(m.containerId)) {
      sg.containers.push(m.containerId);
    }
    if (m.diffState && !sg.diffState) {
      sg.diffState = m.diffState;
    }
  }

  return {containers, newSubgraphs, subgraphs};
}

/**
 * Fetches real subgraph names/types from the backend and overlays them onto
 * the placeholder entries `deriveContainersAndSubgraphs` produces, mutating
 * `subgraphs` in place. Failure is non-fatal — the placeholder name is left
 * in place so a naming lookup failure doesn't block the graph from loading.
 */
async function applyRealSubgraphNames(
  projectId: string,
  subgraphs: Record<string, Subgraph>,
): Promise<void> {
  const subgraphIds = Object.keys(subgraphs);
  if (subgraphIds.length === 0) {
    return;
  }

  const result = await getSubgraphsByIds(projectId, subgraphIds);
  if (!result.success || !result.data) {
    logger.error('graphDataSlice: applyRealSubgraphNames — API error', {
      action: 'loadGraphData',
      component: 'graphDataSlice',
      error: result.message,
    });
    return;
  }

  for (const dto of result.data) {
    const sg = subgraphs[dto.systemId];
    if (sg) {
      sg.subgraphName = dto.name;
      sg.subgraphType = dto.subGraphSharedType;
    }
  }
}

/**
 * Maps one `SpfModuleDto` to a `ModuleInstance`, reused for incremental
 * reconciliation (design.md §6.3). Deliberately does not set
 * `diffState`/`diffChangedFields` from `m.changeInfo?.changeType` —
 * bucket membership (added/updated/deleted), not an entity's own
 * `changeInfo.changeType`, is the sole reconciliation signal for a
 * mutation response; `diffState` is a Diff/Merge snapshot-rendering
 * concept that does not apply here.
 *
 * `existing` (the module's own prior `ModuleInstance`, if any) is
 * consulted only for `position` — `SpfModuleDto` carries no position
 * field, so an update must carry the canvas position forward rather than
 * resetting it to `{x: 0, y: 0}`.
 */
function toModuleInstance(
  m: SpfModuleDto,
  moduleType: string,
  existing: ModuleInstance | undefined,
): ModuleInstance {
  const inputPorts: Port[] = (m.dataPorts ?? [])
    .filter((p) => p.portIoType === 'Input')
    .map((p) => ({
      direction: 'input' as const,
      isStatic: p.portType === 'Static',
      portId: p.systemId,
      portName: p.name,
      portType: 'data' as const,
      totalLinksAtPort: p.totalLinksAtPort,
    }));
  const controlPorts: Port[] = (m.controlPorts ?? []).map((p) => ({
    direction: 'input' as const,
    isStatic: p.portType === 'Static',
    portId: p.systemId,
    portName: p.controlPortName,
    portType: 'control' as const,
    totalLinksAtPort: 0,
  }));
  const outputPorts: Port[] = (m.dataPorts ?? [])
    .filter((p) => p.portIoType === 'Output')
    .map((p) => ({
      direction: 'output' as const,
      isStatic: p.portType === 'Static',
      portId: p.systemId,
      portName: p.name,
      portType: 'data' as const,
      totalLinksAtPort: p.totalLinksAtPort,
    }));
  return {
    containerId: String(m.containerId),
    displayName: m.alias || m.name,
    inputPorts: [...inputPorts, ...controlPorts],
    moduleId: String(m.moduleId),
    moduleInstanceId: m.systemId,
    moduleName: m.name,
    moduleType,
    outputPorts,
    position: existing?.position ?? {x: 0, y: 0},
    subgraphId: m.subgraphId,
  };
}

export function upsertModule(
  moduleInstances: Record<string, ModuleInstance>,
  m: SpfModuleDto,
  moduleType: string,
): Record<string, ModuleInstance> {
  return {
    ...moduleInstances,
    [m.systemId]: toModuleInstance(m, moduleType, moduleInstances[m.systemId]),
  };
}

function removeById<T>(
  record: Record<string, T>,
  systemId: string,
): Record<string, T> {
  const next = {...record};
  delete next[systemId];
  return next;
}

export function toConnection(
  link: ControlLinkDto | DataLinkDto,
  connectionType: 'control' | 'data',
): Connection {
  return {
    connectionId: link.systemId,
    connectionType,
    fromModuleId: link.sourceSystemId,
    fromPortId: link.sourcePortSystemId,
    isDangling: link.isDangling,
    toModuleId: link.destinationSystemId,
    toPortId: link.destinationPortSystemId,
  };
}

export function upsertLink(
  connections: Connection[],
  link: ControlLinkDto | DataLinkDto,
  connectionType: 'control' | 'data',
): Connection[] {
  const conn = toConnection(link, connectionType);
  return [
    ...connections.filter((c) => c.connectionId !== conn.connectionId),
    conn,
  ];
}

function removeLink(connections: Connection[], linkId: string): Connection[] {
  return connections.filter((c) => c.connectionId !== linkId);
}

/**
 * Maps one `SubsystemDto` to a `Subsystem`. Membership lists this
 * incremental path has no equivalent input for are carried forward from
 * `existing` rather than recomputed, defaulting to `[]` only for a
 * subsystem that didn't previously exist.
 */
function toSubsystem(
  ss: SubsystemDto,
  existing: Subsystem | undefined,
): Subsystem {
  return {
    childSubsystemIds: existing?.childSubsystemIds ?? [],
    controlPorts: (ss.controlPorts ?? []).map((p) => ({
      direction: 'input' as const,
      portId: p.systemId,
      portName: p.controlPortName,
      portType: 'control' as const,
    })),
    dataPorts: (ss.dataPorts ?? []).map((p) => ({
      direction: p.portIoType === 'Input' ? 'input' : 'output',
      portId: p.systemId,
      portName: p.name,
      portType: 'data' as const,
    })),
    parentSubsystemId: ss.parentSystemId,
    subgraphs: existing?.subgraphs ?? [],
    subsystemId: ss.systemId,
    subsystemName: ss.name,
  };
}

function upsertSubsystem(
  subsystems: Record<string, Subsystem>,
  ss: SubsystemDto,
): Record<string, Subsystem> {
  return {
    ...subsystems,
    [ss.systemId]: toSubsystem(ss, subsystems[ss.systemId]),
  };
}

/**
 * Returns `module` unchanged if it has no port matching `portId`;
 * otherwise returns a new `ModuleInstance` with that one port's
 * `totalLinksAtPort` adjusted by `delta`. Never mutates in place — this
 * store has no Immer middleware.
 */
function withAdjustedPort(
  module: ModuleInstance,
  portId: string,
  delta: number,
): ModuleInstance {
  const adjust = (p: Port): Port =>
    p.portId === portId
      ? {...p, totalLinksAtPort: p.totalLinksAtPort + delta}
      : p;
  return {
    ...module,
    inputPorts: module.inputPorts.map(adjust),
    outputPorts: module.outputPorts.map(adjust),
  };
}

/**
 * Adjusts port counts for one link's endpoints. `sourceSystemId`/`destinationSystemId`
 * on the link are already the endpoint's `moduleInstanceId` (systemId), so
 * each endpoint is looked up directly in `next` by that key. Takes the
 * narrower `LinkEndpoints` shape rather than a full link DTO — the deleted
 * side only has endpoint fields resolved from `graphData.connections`
 * before removal (the backend's deleted bucket is id-only, see
 * `DeletedIdsCollection`), not a full DTO.
 */
function adjustModuleInstancesForLink(
  moduleInstances: Record<string, ModuleInstance>,
  link: LinkEndpoints,
  delta: number,
): Record<string, ModuleInstance> {
  let next = moduleInstances;
  for (const [instanceId, portId] of [
    [link.sourceSystemId, link.sourcePortSystemId],
    [link.destinationSystemId, link.destinationPortSystemId],
  ] as const) {
    // undefined here means either this endpoint was itself deleted in the
    // same response's module bucket, or it's a subsystem rather than a
    // module — port coloring is a module-port concept only, so there is
    // nothing to adjust for either case; skip, don't throw.
    const module = next[instanceId];
    if (!module) {
      continue;
    }
    next = {
      ...next,
      [instanceId]: withAdjustedPort(module, portId, delta),
    };
  }
  return next;
}

/**
 * Resolves a deleted link's endpoints (`sourceSystemId`/
 * `sourcePortSystemId`/`destinationSystemId`/`destinationPortSystemId`) by
 * looking it up in
 * `graphData.connections` — the backend's deleted bucket only carries the
 * link's id, not its endpoints, so this must run before the link's
 * `Connection` entry is removed.
 */
function resolveLinkEndpoints(
  connections: Connection[],
  linkIds: string[],
): LinkEndpoints[] {
  if (linkIds.length === 0) {
    return [];
  }
  const linkIdSet = new Set(linkIds);
  return connections
    .filter((c) => linkIdSet.has(c.connectionId))
    .map((c) => ({
      destinationPortSystemId: c.toPortId,
      destinationSystemId: c.toModuleId,
      sourcePortSystemId: c.fromPortId,
      sourceSystemId: c.fromModuleId,
    }));
}

/**
 * Creates the graph-data slice for composing into a tab store.
 *
 * @remarks The store type `S` must also compose `ModuleListSlice` — `loadGraphData`
 * reads `get().moduleList` to resolve module types from loaded definitions —
 * and `EditSessionSlice` — `pruneDeletedLinkBookkeeping` reads/writes
 * `get().pairLinksById`/`get().excludedLinks`.
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function used to read moduleList for type resolution.
 * @param projectId - Project identifier passed to the API.
 */
export function createGraphDataSlice<
  S extends GraphDataSlice & ModuleListSlice & EditSessionSlice,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
  projectId: string,
): GraphDataSlice {
  return {
    adjustSurvivingPortCounts: (
      addedLinks: Array<ControlLinkDto | DataLinkDto>,
      deletedLinkEndpoints: LinkEndpoints[],
    ): void => {
      const {graphData} = get();
      if (!graphData) {
        return;
      }
      let moduleInstances = graphData.moduleInstances;
      for (const link of addedLinks) {
        moduleInstances = adjustModuleInstancesForLink(
          moduleInstances,
          link,
          +1,
        );
      }
      for (const link of deletedLinkEndpoints) {
        moduleInstances = adjustModuleInstancesForLink(
          moduleInstances,
          link,
          -1,
        );
      }
      logger.debug(
        `graphDataSlice: adjustSurvivingPortCounts — added=${addedLinks.length}, deleted=${deletedLinkEndpoints.length}`,
        {
          action: 'adjustSurvivingPortCounts',
          component: 'graphDataSlice',
        },
      );
      set({
        graphData: {...graphData, moduleInstances},
      } as unknown as Partial<S>);
    },

    applyAddedCollection: (collection: ComponentCollectionDto): void => {
      const {graphData, moduleList} = get();
      if (!graphData) {
        return;
      }
      const defModuleTypeById = new Map(
        moduleList.map((d) => [d.moduleId, d.moduleType]),
      );
      let moduleInstances = graphData.moduleInstances;
      for (const m of collection.spfModules) {
        moduleInstances = upsertModule(
          moduleInstances,
          m,
          defModuleTypeById.get(String(m.moduleId)) ?? '',
        );
      }
      let subsystems = graphData.subsystems;
      for (const ss of collection.subsystems ?? []) {
        subsystems = upsertSubsystem(subsystems, ss);
      }
      let connections = graphData.connections;
      for (const l of collection.dataLinks) {
        connections = upsertLink(connections, l, 'data');
      }
      for (const l of collection.controlLinks) {
        connections = upsertLink(connections, l, 'control');
      }
      logger.debug('graphDataSlice: applyAddedCollection', {
        action: 'applyAddedCollection',
        component: 'graphDataSlice',
      });
      set({
        graphData: {...graphData, connections, moduleInstances, subsystems},
      } as unknown as Partial<S>);
    },

    applyComponentCollection: async (collections: {
      added: ComponentCollectionDto;
      deleted: DeletedIdsCollection;
      updated: ComponentCollectionDto;
    }): Promise<void> => {
      logger.debug('graphDataSlice: applyComponentCollection', {
        action: 'applyComponentCollection',
        component: 'graphDataSlice',
      });

      const deletedLinkIds = [
        ...collections.deleted.dataLinks,
        ...collections.deleted.controlLinks,
      ];
      // The deleted bucket carries link ids only (design.md §6.3) — their
      // endpoints must be resolved from the still-intact `graphData.connections`
      // before applyDeletedCollection removes them below, since
      // adjustSurvivingPortCounts needs each endpoint's moduleId/portId.
      const deletedLinkEndpoints = resolveLinkEndpoints(
        get().graphData?.connections ?? [],
        deletedLinkIds,
      );

      // 1. Merge every bucket into moduleInstances/subsystems/connections.
      //    "added" and "updated" are both pure upserts — only "deleted"
      //    differs (removal, not upsert).
      get().applyAddedCollection(collections.added);
      get().applyAddedCollection(collections.updated);
      get().applyDeletedCollection(collections.deleted);

      // 2. Containers/subgraphs are never first-class response entities —
      //    re-derive them from whichever modules survived step 1, fetching
      //    real names for any subgraph newly created by this mutation.
      await get().recomputeContainersAndSubgraphs();

      // 3. Prune session-local maps for every subgraph the backend reports
      //    as deleted (its last module was removed) — subgraphProvenanceById/
      //    kvSelectionsById/pairLinksById must not keep a stale entry for a
      //    subgraph that no longer derives from any surviving module.
      for (const subgraphId of collections.deleted.subgraphs ?? []) {
        get().pruneSessionLocalMapsForSubgraph(subgraphId);
      }

      // 4. pairLinksById/excludedLinks — direct lookup against the
      //    deleted bucket's own link ids, no diffing needed.
      get().pruneDeletedLinkBookkeeping(deletedLinkIds);

      // 5. totalLinksAtPort — the response never includes the surviving
      //    sibling endpoint's updated count directly.
      get().adjustSurvivingPortCounts(
        [...collections.added.dataLinks, ...collections.added.controlLinks],
        deletedLinkEndpoints,
      );

      // 6. Any successful add/delete reconciled through here leaves the
      //    session dirty — gates the Apply button (apply-discard-changes
      //    design.md §7.1).
      get().markDirty();
    },

    applyDeletedCollection: (collection: DeletedIdsCollection): void => {
      const {graphData} = get();
      if (!graphData) {
        return;
      }
      let moduleInstances = graphData.moduleInstances;
      for (const systemId of collection.spfModules) {
        moduleInstances = removeById(moduleInstances, systemId);
      }
      let subsystems = graphData.subsystems;
      for (const systemId of collection.subsystems ?? []) {
        subsystems = removeById(subsystems, systemId);
      }
      let connections = graphData.connections;
      for (const linkId of collection.dataLinks) {
        connections = removeLink(connections, linkId);
      }
      for (const linkId of collection.controlLinks) {
        connections = removeLink(connections, linkId);
      }
      logger.debug('graphDataSlice: applyDeletedCollection', {
        action: 'applyDeletedCollection',
        component: 'graphDataSlice',
      });
      set({
        graphData: {...graphData, connections, moduleInstances, subsystems},
      } as unknown as Partial<S>);
    },

    clearGraphData: () => {
      logger.debug('graphDataSlice: clearGraphData', {
        action: 'clearGraphData',
        component: 'graphDataSlice',
      });
      set({
        graphData: null,
        graphDataError: null,
        graphDataStatus: 'uninitialized',
        isDirty: false,
      } as Partial<S>);
    },

    graphData: null,

    graphDataError: null,

    graphDataStatus: 'uninitialized',

    initializeEmptyGraphData: () => {
      logger.debug('graphDataSlice: initializeEmptyGraphData', {
        action: 'initializeEmptyGraphData',
        component: 'graphDataSlice',
      });
      set({
        graphData: {
          connections: [],
          containers: {},
          moduleInstances: {},
          selectedUsecases: [],
          subgraphs: {},
          subsystems: {},
        },
        graphDataError: null,
        graphDataStatus: 'ready',
        isDirty: false,
      } as unknown as Partial<S>);
    },

    isDirty: false,

    loadGraphData: async (
      usecases: string[],
      _options?: {stagingSessionId?: string},
    ) => {
      logger.debug('graphDataSlice: loadGraphData — loading', {
        action: 'loadGraphData',
        component: 'graphDataSlice',
      });

      set({
        graphDataError: null,
        graphDataStatus: 'loading',
      } as unknown as Partial<S>);

      try {
        const result = await getUsecaseComponents(projectId, usecases);

        if (!result.success || !result.data) {
          logger.error('graphDataSlice: loadGraphData — API error', {
            action: 'loadGraphData',
            component: 'graphDataSlice',
            error: result.message,
          });
          set({
            graphDataError: result.message ?? 'API error',
            graphDataStatus: 'error',
          } as unknown as Partial<S>);
          return;
        }

        const dto = result.data;
        const spfModules = dto.spfModules ?? [];
        const subsystemDtos = dto.subsystems ?? [];

        // Build numeric id → systemId lookup used to resolve a module's
        // parentId (its parent subsystem's numeric id) to that subsystem's
        // systemId, below.
        const numericIdToSystemId = new Map<number, string>();
        for (const m of spfModules) {
          numericIdToSystemId.set(m.id, m.systemId);
        }
        for (const ss of subsystemDtos) {
          numericIdToSystemId.set(ss.id, ss.systemId);
        }

        // Build moduleId → moduleType lookup from already-loaded module definitions.
        const defModuleTypeById = new Map(
          get().moduleList.map((d) => [d.moduleId, d.moduleType]),
        );

        // parentId on a module refers to its parent subsystem's numeric id.
        const subsystemIdToSubgraphs = new Map<string, string[]>();
        for (const m of spfModules) {
          if (m.parentId !== undefined) {
            const ssId = numericIdToSystemId.get(m.parentId);
            if (ssId) {
              const sgId = m.subgraphId;
              const list = subsystemIdToSubgraphs.get(ssId);
              if (list) {
                list.push(sgId);
              } else {
                subsystemIdToSubgraphs.set(ssId, [sgId]);
              }
            }
          }
        }

        const moduleInstances: Record<string, ModuleInstance> = {};
        for (const m of spfModules) {
          const instance = toModuleInstance(
            m,
            defModuleTypeById.get(String(m.moduleId)) ?? '',
            undefined,
          );
          const diffState = toDiffState(m.changeInfo?.changeType);
          if (diffState) {
            instance.diffState = diffState;
          }
          if (m.ckvs) {
            instance.ckvs = m.ckvs;
          }
          if (m.tags) {
            instance.tags = m.tags;
          }
          moduleInstances[m.systemId] = instance;
        }

        const {containers, newSubgraphs, subgraphs} =
          deriveContainersAndSubgraphs(moduleInstances);
        await applyRealSubgraphNames(projectId, newSubgraphs);

        const subsystemIdToChildSubsystemIds = new Map<string, string[]>();
        for (const ss of subsystemDtos) {
          if (ss.parentSystemId === undefined) {
            continue;
          }
          const list = subsystemIdToChildSubsystemIds.get(ss.parentSystemId);
          if (list) {
            list.push(ss.systemId);
          } else {
            subsystemIdToChildSubsystemIds.set(ss.parentSystemId, [
              ss.systemId,
            ]);
          }
        }

        const subsystems: Record<string, Subsystem> = {};
        for (const ss of subsystemDtos) {
          subsystems[ss.systemId] = {
            childSubsystemIds:
              subsystemIdToChildSubsystemIds.get(ss.systemId) ?? [],
            controlPorts: (ss.controlPorts ?? []).map((p) => ({
              direction: 'input' as const,
              portId: p.systemId,
              portName: p.controlPortName,
              portType: 'control' as const,
            })),
            dataPorts: (ss.dataPorts ?? []).map((p) => ({
              direction: p.portIoType === 'Input' ? 'input' : 'output',
              portId: p.systemId,
              portName: p.name,
              portType: 'data' as const,
            })),
            parentSubsystemId: ss.parentSystemId,
            subgraphs: subsystemIdToSubgraphs.get(ss.systemId) ?? [],
            subsystemId: ss.systemId,
            subsystemName: ss.name,
          };
        }

        const connections: Connection[] = [];
        for (const link of dto.dataLinks) {
          const conn = toConnection(link, 'data');
          connections.push(conn);
        }
        for (const link of dto.controlLinks) {
          const conn = toConnection(link, 'control');
          connections.push(conn);
        }

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
          graphDataError: null,
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
        set({
          graphDataError: errorMessage,
          graphDataStatus: 'error',
        } as unknown as Partial<S>);
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

    pruneDeletedLinkBookkeeping: (deletedLinkIds: string[]): void => {
      const idSet = new Set(deletedLinkIds);
      if (idSet.size === 0) {
        return;
      }
      logger.debug(
        `graphDataSlice: pruneDeletedLinkBookkeeping — count=${idSet.size}`,
        {
          action: 'pruneDeletedLinkBookkeeping',
          component: 'graphDataSlice',
        },
      );
      const {excludedLinks, pairLinksById} = get();
      const nextPairLinksById: Record<string, SubgraphPairResponseDto> = {};
      for (const [pairKey, pair] of Object.entries(pairLinksById)) {
        const dataLinks = pair.dataLinks.filter((l) => !idSet.has(l.systemId));
        const controlLinks = pair.controlLinks.filter(
          (l) => !idSet.has(l.systemId),
        );
        if (dataLinks.length === 0 && controlLinks.length === 0) {
          continue;
        }
        nextPairLinksById[pairKey] = {...pair, controlLinks, dataLinks};
      }
      set({
        excludedLinks: excludedLinks.filter((l) => !idSet.has(l.connectionId)),
        pairLinksById: nextPairLinksById,
      } as unknown as Partial<S>);
    },

    recomputeContainersAndSubgraphs: async (): Promise<void> => {
      const {graphData} = get();
      if (!graphData) {
        return;
      }
      const {containers, newSubgraphs, subgraphs} =
        deriveContainersAndSubgraphs(
          graphData.moduleInstances,
          graphData.subgraphs,
        );
      logger.debug('graphDataSlice: recomputeContainersAndSubgraphs', {
        action: 'recomputeContainersAndSubgraphs',
        component: 'graphDataSlice',
      });

      // A subgraph deriveContainersAndSubgraphs reports as new is freshly
      // created by this mutation — it only got the `Subgraph ${id}`
      // placeholder and needs its real name/type fetched, same as
      // loadGraphData does for a full snapshot.
      if (Object.keys(newSubgraphs).length > 0) {
        await applyRealSubgraphNames(projectId, newSubgraphs);
      }

      set({
        graphData: {...graphData, containers, subgraphs},
      } as unknown as Partial<S>);
    },
  };
}
