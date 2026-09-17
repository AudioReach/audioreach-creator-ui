/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {CkvDto, TagInfoDto} from '~entities/spf-module-data';
import type {SubgraphPairResponseDto} from '~entities/subgraph-definitions/model/subgraph-response.dto';
import {
  getSubgraphsByIds,
  getUsecaseComponents,
  getUsecaseComponentsFilteredBySubsystem,
} from '~entities/usecases';
import type {
  ComponentCollectionDto,
  ControlLinkDto,
  DataLinkDto,
  SpfModuleDto,
  SubsystemDto,
} from '~entities/usecases/model/usecase-component.dto';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';
import type {SubsystemSlice} from '~shared/store/tab-store-slices/subsystem-slice';

import {buildSubsystemTree} from '../lib/subsystem-tree.utils';

import type {EditSessionSlice} from './edit-session-slice';
import type {ModuleListSlice} from './module-list-slice';

export type DiffState = 'added' | 'removed' | 'modified' | 'common';

export interface Port {
  activeLinks: number;
  direction: 'input' | 'output';
  isStatic: boolean;
  portId: string;
  portName: string;
  portSystemId: string;
  portType: 'control' | 'data';
  totalLinksAtPort: number;
}

export interface ModuleInstance {
  ckvs?: CkvDto[];
  containerSystemId: string;
  diffChangedFields?: string[];
  diffState?: DiffState;
  displayName: string;
  inputPorts: Port[];
  maxControlPorts?: number;
  maxInputPorts?: number;
  maxOutputPorts?: number;
  moduleDefinitionSystemId: string;
  moduleName: string;
  moduleType: string;
  naturalId: number;
  outputPorts: Port[];
  position: {x: number; y: number};
  subgraphSystemId: string;
  systemId: string;
  tags?: TagInfoDto[];
}

export interface Connection {
  destinationPortSystemId: string;
  destinationSystemId: string;
  diffState?: DiffState;
  isInterUsecase: boolean;
  linkKind: 'control' | 'data';
  sourcePortSystemId: string;
  sourceSystemId: string;
  systemId: string;
}

export interface Subgraph {
  containers: string[];
  diffState?: DiffState;
  subgraphName: string;
  subgraphType: string;
  systemId: string;
}

export interface Container {
  moduleInstances: string[];
  subgraphSystemId: string;
  systemId: string;
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

export interface PortRefreshEndpoint {
  moduleSystemId: string;
  portSystemId: string;
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
    options?: {filterBySubsystem?: boolean; stagingSessionId?: string},
  ) => Promise<void>;
  markClean: () => void;
  markDirty: () => void;
  pruneDeletedLinkBookkeeping: (deletedLinkIds: string[]) => void;
  recomputeContainersAndSubgraphs: () => Promise<void>;
  updateContainerIdLocal: (containerSystemId: string, newId: string) => void;
  updateModuleAliasLocal: (moduleSystemId: string, alias: string) => void;
  updateModuleContainerLocal: (
    moduleSystemId: string,
    newContainerSystemId: string,
  ) => void;
  updateModulePortCountLocal: (
    moduleSystemId: string,
    field: 'maxControlPorts' | 'maxInputPorts' | 'maxOutputPorts',
    value: number,
  ) => void;
  updateSubgraphNameLocal: (subgraphSystemId: string, name: string) => void;
  updateSubsystemNameLocal: (subsystemId: string, name: string) => void;
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

  for (const [moduleSystemId, m] of Object.entries(moduleInstances)) {
    if (!(m.containerSystemId in containers)) {
      containers[m.containerSystemId] = {
        moduleInstances: [],
        subgraphSystemId: m.subgraphSystemId,
        systemId: m.containerSystemId,
      };
    }
    containers[m.containerSystemId].moduleInstances.push(moduleSystemId);

    if (!(m.subgraphSystemId in subgraphs)) {
      const existing = existingSubgraphs?.[m.subgraphSystemId];
      const sg: Subgraph = {
        containers: [],
        subgraphName:
          existing?.subgraphName ?? `Subgraph ${m.subgraphSystemId}`,
        subgraphType: existing?.subgraphType ?? '',
        systemId: m.subgraphSystemId,
      };
      subgraphs[m.subgraphSystemId] = sg;
      if (!existing) {
        newSubgraphs[m.subgraphSystemId] = sg;
      }
    }
    const sg = subgraphs[m.subgraphSystemId];
    if (!sg.containers.includes(m.containerSystemId)) {
      sg.containers.push(m.containerSystemId);
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
  if (hasBlockingIssues(result) || !result.data) {
    logger.error('graphDataSlice: applyRealSubgraphNames — API error', {
      action: 'loadGraphData',
      component: 'graphDataSlice',
      error: getIssueMessage(result, 'Failed to load subgraph names'),
    });
    return;
  }

  for (const dto of result.data) {
    const sg = subgraphs[dto.systemId];
    if (sg) {
      sg.subgraphName = dto.name ?? '';
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
  activeLinksByPortId: Map<string, number>,
): ModuleInstance {
  const inputPorts: Port[] = (m.dataPorts ?? [])
    .filter((p) => p.portIoType === 'Input')
    .map((p) => ({
      activeLinks: activeLinksByPortId.get(p.systemId) ?? 0,
      direction: 'input' as const,
      isStatic: p.portType === 'Static',
      portId: String(p.naturalId),
      portName: p.name,
      portSystemId: p.systemId,
      portType: 'data' as const,
      totalLinksAtPort: p.totalLinksAtPort,
    }));
  const controlPorts: Port[] = (m.controlPorts ?? []).map((p) => ({
    activeLinks: activeLinksByPortId.get(p.systemId) ?? 0,
    direction: 'input' as const,
    isStatic: p.portType === 'Static',
    portId: String(p.naturalId),
    portName: p.controlPortName,
    portSystemId: p.systemId,
    portType: 'control' as const,
    totalLinksAtPort: p.totalLinksAtPort ?? 0,
  }));
  const outputPorts: Port[] = (m.dataPorts ?? [])
    .filter((p) => p.portIoType === 'Output')
    .map((p) => ({
      activeLinks: activeLinksByPortId.get(p.systemId) ?? 0,
      direction: 'output' as const,
      isStatic: p.portType === 'Static',
      portId: String(p.naturalId),
      portName: p.name,
      portSystemId: p.systemId,
      portType: 'data' as const,
      totalLinksAtPort: p.totalLinksAtPort,
    }));
  return {
    containerSystemId: m.containerSystemId,
    displayName: m.alias || m.name,
    inputPorts: [...inputPorts, ...controlPorts],
    moduleDefinitionSystemId: m.moduleDefinitionSystemId,
    moduleName: m.name,
    moduleType,
    naturalId: m.naturalId,
    outputPorts,
    position: existing?.position ?? {x: 0, y: 0},
    subgraphSystemId: m.subgraphSystemId,
    systemId: m.systemId,
  };
}

/**
 * `connections` must be the module's up-to-date connection list
 */
export function upsertModule(
  moduleInstances: Record<string, ModuleInstance>,
  m: SpfModuleDto,
  moduleType: string,
  connections: Connection[],
): Record<string, ModuleInstance> {
  return {
    ...moduleInstances,
    [m.systemId]: toModuleInstance(
      m,
      moduleType,
      moduleInstances[m.systemId],
      buildActiveLinksByPortId(connections),
    ),
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
  linkKind: 'control' | 'data',
): Connection {
  return {
    destinationPortSystemId: link.destinationPortSystemId,
    destinationSystemId: link.destinationSystemId,
    isInterUsecase: link.isInterUsecase,
    linkKind,
    sourcePortSystemId: link.sourcePortSystemId,
    sourceSystemId: link.sourceSystemId,
    systemId: link.systemId,
  };
}

export function upsertLink(
  connections: Connection[],
  link: ControlLinkDto | DataLinkDto,
  linkKind: 'control' | 'data',
): Connection[] {
  const conn = toConnection(link, linkKind);
  return [
    ...connections.filter((c) => c.systemId !== conn.systemId),
    conn,
  ];
}

function removeLink(connections: Connection[], linkId: string): Connection[] {
  return connections.filter((c) => c.systemId !== linkId);
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
    subsystemName: ss.name ?? '',
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
 * Returns `module` unchanged if it has no port matching `portSystemId`;
 * otherwise returns a new `ModuleInstance` with that one port's
 * `totalLinksAtPort` adjusted by `delta`. Never mutates in place — this
 * store has no Immer middleware.
 */
function withAdjustedPort(
  module: ModuleInstance,
  portSystemId: string,
  delta: number,
): ModuleInstance {
  const adjust = (p: Port): Port =>
    p.portSystemId === portSystemId
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
  for (const [instanceId, portSystemId] of [
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
      [instanceId]: withAdjustedPort(module, portSystemId, delta),
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
    .filter((c) => linkIdSet.has(c.systemId))
    .map((c) => ({
      destinationPortSystemId: c.destinationPortSystemId,
      destinationSystemId: c.destinationSystemId,
      sourcePortSystemId: c.sourcePortSystemId,
      sourceSystemId: c.sourceSystemId,
    }));
}

/**
 * Counts live connections touching `portSystemId`, in either direction.
 * Always a full rescan of `connections` — `activeLinks` is session-derived,
 * not delta-adjusted like `totalLinksAtPort` (see `withAdjustedPort`).
 */
function countActiveLinks(
  connections: Connection[],
  portSystemId: string,
): number {
  return connections.filter(
    (c) =>
      c.sourcePortSystemId === portSystemId ||
      c.destinationPortSystemId === portSystemId,
  ).length;
}

/**
 * Counts live connections per port across `connections`,
 * keyed by `portSystemId`
 */
function buildActiveLinksByPortId(
  connections: Connection[],
): Map<string, number> {
  const activeLinksByPortId = new Map<string, number>();
  for (const c of connections) {
    activeLinksByPortId.set(
      c.sourcePortSystemId,
      (activeLinksByPortId.get(c.sourcePortSystemId) ?? 0) + 1,
    );
    activeLinksByPortId.set(
      c.destinationPortSystemId,
      (activeLinksByPortId.get(c.destinationPortSystemId) ?? 0) + 1,
    );
  }
  return activeLinksByPortId;
}

/**
 * Returns `module` unchanged if it has no port matching `portSystemId`,
 * otherwise returns a new `ModuleInstance` with that port's `activeLinks`
 * set. Never mutates in place — this store has no Immer middleware.
 */
function withRefreshedPort(
  module: ModuleInstance,
  portSystemId: string,
  activeLinks: number,
): ModuleInstance {
  const updatePort = (p: Port): Port =>
    p.portSystemId === portSystemId ? {...p, activeLinks} : p;
  return {
    ...module,
    inputPorts: module.inputPorts.map(updatePort),
    outputPorts: module.outputPorts.map(updatePort),
  };
}

/**
 * Pure `totalLinksAtPort` adjustment for `adjustSurvivingPortCounts` —
 * factored out so `applyComponentCollection` can chain it with
 * {@link computeRefreshedModuleInstances} against the same
 * `moduleInstances` snapshot and commit both via a single `set()`.
 */
function computeAdjustedModuleInstances(
  moduleInstances: Record<string, ModuleInstance>,
  addedLinks: Array<ControlLinkDto | DataLinkDto>,
  deletedLinkEndpoints: LinkEndpoints[],
): Record<string, ModuleInstance> {
  let next = moduleInstances;
  for (const link of addedLinks) {
    next = adjustModuleInstancesForLink(next, link, +1);
  }
  for (const link of deletedLinkEndpoints) {
    next = adjustModuleInstancesForLink(next, link, -1);
  }
  return next;
}

/**
 * Pure `activeLinks` recompute for `applyComponentCollection` — factored
 * out so it can be chained with {@link computeAdjustedModuleInstances}
 * against the same `moduleInstances` snapshot and committed via a single
 * `set()`.
 */
function computeRefreshedModuleInstances(
  moduleInstances: Record<string, ModuleInstance>,
  connections: Connection[],
  endpoints: PortRefreshEndpoint[],
): Record<string, ModuleInstance> {
  const uniqueEndpoints = new Map(
    endpoints.map((e) => [`${e.moduleSystemId}:${e.portSystemId}`, e]),
  );
  let next = moduleInstances;
  for (const {moduleSystemId, portSystemId} of uniqueEndpoints.values()) {
    const module = next[moduleSystemId];
    if (!module) {
      continue;
    }
    next = {
      ...next,
      [moduleSystemId]: withRefreshedPort(
        module,
        portSystemId,
        countActiveLinks(connections, portSystemId),
      ),
    };
  }
  return next;
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
  S extends GraphDataSlice &
    ModuleListSlice &
    EditSessionSlice &
    SubsystemSlice,
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
      const moduleInstances = computeAdjustedModuleInstances(
        graphData.moduleInstances,
        addedLinks,
        deletedLinkEndpoints,
      );
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
        moduleList.map((d) => [d.moduleDefinitionSystemId, d.moduleType]),
      );
      // Connections must be merged before modules are upserted below —
      // upsertModule recomputes activeLinks from this same list
      let connections = graphData.connections;
      for (const l of collection.dataLinks) {
        connections = upsertLink(connections, l, 'data');
      }
      for (const l of collection.controlLinks) {
        connections = upsertLink(connections, l, 'control');
      }
      let moduleInstances = graphData.moduleInstances;
      for (const m of collection.spfModules) {
        moduleInstances = upsertModule(
          moduleInstances,
          m,
          defModuleTypeById.get(m.moduleDefinitionSystemId) ?? '',
          connections,
        );
      }
      let subsystems = graphData.subsystems;
      for (const ss of collection.subsystems ?? []) {
        subsystems = upsertSubsystem(subsystems, ss);
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
      // adjustSurvivingPortCounts needs each endpoint's moduleId/portSystemId.
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

      // 5. totalLinksAtPort and activeLinks both derive from this same
      //    added/deleted link diff — computed and committed together via a
      //    single set() so this mutation causes exactly one graphData
      //    reference change (and one downstream layout/render pass), not
      //    two.
      const addedLinks = [
        ...collections.added.dataLinks,
        ...collections.added.controlLinks,
      ];
      const portRefreshEndpoints: PortRefreshEndpoint[] = [];
      for (const link of addedLinks) {
        portRefreshEndpoints.push(
          {
            moduleSystemId: link.sourceSystemId,
            portSystemId: link.sourcePortSystemId,
          },
          {
            moduleSystemId: link.destinationSystemId,
            portSystemId: link.destinationPortSystemId,
          },
        );
      }
      for (const endpoints of deletedLinkEndpoints) {
        portRefreshEndpoints.push(
          {
            moduleSystemId: endpoints.sourceSystemId,
            portSystemId: endpoints.sourcePortSystemId,
          },
          {
            moduleSystemId: endpoints.destinationSystemId,
            portSystemId: endpoints.destinationPortSystemId,
          },
        );
      }

      const {graphData} = get();
      if (graphData) {
        const adjustedModuleInstances = computeAdjustedModuleInstances(
          graphData.moduleInstances,
          addedLinks,
          deletedLinkEndpoints,
        );
        const moduleInstances = computeRefreshedModuleInstances(
          adjustedModuleInstances,
          graphData.connections,
          portRefreshEndpoints,
        );
        logger.debug(
          `graphDataSlice: applyComponentCollection — adjusting port counts (added=${addedLinks.length}, deleted=${deletedLinkEndpoints.length}, portRefresh=${portRefreshEndpoints.length})`,
          {action: 'applyComponentCollection', component: 'graphDataSlice'},
        );
        set({
          graphData: {...graphData, moduleInstances},
        } as unknown as Partial<S>);
      }

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
      options?: {filterBySubsystem?: boolean; stagingSessionId?: string},
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
        const result = options?.filterBySubsystem
          ? await getUsecaseComponentsFilteredBySubsystem(projectId, usecases)
          : await getUsecaseComponents(projectId, usecases);

        if (hasBlockingIssues(result) || !result.data) {
          logger.error('graphDataSlice: loadGraphData — API error', {
            action: 'loadGraphData',
            component: 'graphDataSlice',
            error: getIssueMessage(result, 'API error'),
          });
          set({
            graphDataError: getIssueMessage(result, 'API error'),
            graphDataStatus: 'error',
          } as unknown as Partial<S>);
          return;
        }

        const dto = result.data;
        const spfModules = dto.spfModules ?? [];
        const subsystemDtos = dto.subsystems ?? [];

        // Build moduleId → moduleType lookup from already-loaded module definitions.
        const defModuleTypeById = new Map(
        get().moduleList.map((d) => [d.moduleDefinitionSystemId, d.moduleType]),
        );

        const subsystemIdToSubgraphs = new Map<string, string[]>();
        for (const m of spfModules) {
          const ssId = m.parentSystemId;
          if (ssId) {
            const sgId = m.subgraphSystemId;
            const list = subsystemIdToSubgraphs.get(ssId);
            if (list) {
              list.push(sgId);
            } else {
              subsystemIdToSubgraphs.set(ssId, [sgId]);
            }
          }
        }

        const connections: Connection[] = [];
        for (const link of dto.dataLinks) {
          connections.push(toConnection(link, 'data'));
        }
        for (const link of dto.controlLinks) {
          connections.push(toConnection(link, 'control'));
        }

        const activeLinksByPortId = buildActiveLinksByPortId(connections);

        const moduleInstances: Record<string, ModuleInstance> = {};
        for (const m of spfModules) {
          const instance = toModuleInstance(
            m,
            defModuleTypeById.get(m.moduleDefinitionSystemId) ?? '',
            undefined,
            activeLinksByPortId,
          );
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
            subsystemName: ss.name ?? '',
          };
        }

        get().setSubsystemData(buildSubsystemTree(subsystemDtos, spfModules));

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
        excludedLinks: excludedLinks.filter((l) => !idSet.has(l.systemId)),
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

    updateContainerIdLocal: (
      containerSystemId: string,
      newId: string,
    ): void => {
      const {graphData} = get();
      const current = graphData?.containers[containerSystemId];
      if (!graphData || !current) {
        return;
      }

      const containers = {...graphData.containers};
      delete containers[containerSystemId];
      containers[newId] = {...current, systemId: newId};

      const moduleInstances = Object.fromEntries(
        Object.entries(graphData.moduleInstances).map(([id, module]) => [
          id,
          module.containerSystemId === containerSystemId
            ? {...module, containerSystemId: newId}
            : module,
        ]),
      );

      set({
        graphData: {...graphData, containers, moduleInstances},
      } as unknown as Partial<S>);
      get().markDirty();
    },

    updateModuleAliasLocal: (moduleSystemId: string, alias: string): void => {
      const {graphData} = get();
      const current = graphData?.moduleInstances[moduleSystemId];
      if (!graphData || !current) {
        return;
      }
      set({
        graphData: {
          ...graphData,
          moduleInstances: {
            ...graphData.moduleInstances,
        [moduleSystemId]: {...current, displayName: alias},
          },
        },
      } as unknown as Partial<S>);
      get().markDirty();
    },

    updateModuleContainerLocal: (
      moduleSystemId: string,
      newContainerSystemId: string,
    ): void => {
      const {graphData} = get();
      const current = graphData?.moduleInstances[moduleSystemId];
      if (!graphData || !current) {
        return;
      }
      const moduleInstances = {
        ...graphData.moduleInstances,
        [moduleSystemId]: {
          ...current,
          containerSystemId: newContainerSystemId,
        },
      };
      const {containers, subgraphs} = deriveContainersAndSubgraphs(
        moduleInstances,
        graphData.subgraphs,
      );
      set({
        graphData: {
          ...graphData,
          containers,
          moduleInstances,
          subgraphs,
        },
      } as unknown as Partial<S>);
      get().markDirty();
    },

    updateModulePortCountLocal: (
      moduleSystemId: string,
      field: 'maxControlPorts' | 'maxInputPorts' | 'maxOutputPorts',
      value: number,
    ): void => {
      const {graphData} = get();
      const current = graphData?.moduleInstances[moduleSystemId];
      if (!graphData || !current) {
        return;
      }
      set({
        graphData: {
          ...graphData,
          moduleInstances: {
            ...graphData.moduleInstances,
        [moduleSystemId]: {...current, [field]: value},
          },
        },
      } as unknown as Partial<S>);
      get().markDirty();
    },

    updateSubgraphNameLocal: (
      subgraphSystemId: string,
      name: string,
    ): void => {
      const {graphData} = get();
      const current = graphData?.subgraphs[subgraphSystemId];
      if (!graphData || !current) {
        return;
      }
      set({
        graphData: {
          ...graphData,
          subgraphs: {
            ...graphData.subgraphs,
            [subgraphSystemId]: {...current, subgraphName: name},
          },
        },
      } as unknown as Partial<S>);
      get().markDirty();
    },

    updateSubsystemNameLocal: (subsystemId: string, name: string): void => {
      const {graphData} = get();
      const current = graphData?.subsystems[subsystemId];
      if (!graphData || !current) {
        return;
      }
      set({
        graphData: {
          ...graphData,
          subsystems: {
            ...graphData.subsystems,
            [subsystemId]: {...current, subsystemName: name},
          },
        },
      } as unknown as Partial<S>);
      get().markDirty();
    },
  };
}
