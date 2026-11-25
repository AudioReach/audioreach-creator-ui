/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {SubgraphPairResponseDto} from '~entities/subgraph-definitions';
import {deleteSpfModule} from '~entities/spf-modules';
import {
  getSubgraphContents,
  getSubgraphPairs,
  renameSubgraph as renameSubgraphApi,
  toControlLinkType,
} from '~entities/usecases';
import type {
  ControlLinkDto,
  DataLinkDto,
} from '~entities/usecases/model/usecase-component.dto';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';

import {withMutationLock} from '../model/edit-session-slice';
import {
  type LinkEndpoints,
  upsertLink,
  upsertModule,
} from '../model/graph-data-slice';
import type {GraphDesignerStore} from '../model/graph-designer-store';

import {EMPTY_COLLECTION, type InnerActionOptions} from './module-operations';
import {toDeletedIdsCollection} from './spf-module-delete-response';

export interface SubgraphDropPayload {
  kind: 'subgraph';
  subgraphId: string;
}

export function parseSubgraphDropPayload(
  dropData: string,
): SubgraphDropPayload | null {
  try {
    const parsed: unknown = JSON.parse(dropData);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as {kind?: unknown}).kind === 'subgraph' &&
      typeof (parsed as {subgraphId?: unknown}).subgraphId === 'string'
    ) {
      return parsed as SubgraphDropPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export const CAN_CONNECT_TO_PROXY_NODE = false;

export interface SubgraphOperations {
  deleteSubgraph: (
    get: () => GraphDesignerStore,
    subgraphId: string,
  ) => Promise<boolean>;
  deleteSubgraphInner: (
    get: () => GraphDesignerStore,
    subgraphId: string,
    options?: InnerActionOptions,
  ) => Promise<boolean>;
  excludeLink: (get: () => GraphDesignerStore, connectionId: string) => void;
  excludeSubgraph: (get: () => GraphDesignerStore, subgraphId: string) => void;
  placeSubgraphFromPalette: (
    get: () => GraphDesignerStore,
    subgraphId: string,
    position: {x: number; y: number},
  ) => Promise<boolean>;
  reincludeLink: (get: () => GraphDesignerStore, connectionId: string) => void;
  renameSubgraph: (
    get: () => GraphDesignerStore,
    subgraphId: string,
    newName: string,
  ) => Promise<void>;
}

export function createSubgraphOperations(
  set: StoreApi<GraphDesignerStore>['setState'],
  projectId: string,
): SubgraphOperations {
  function connectionToLinkEndpoints(
    connection: GraphDesignerStore['excludedLinks'][number],
  ): LinkEndpoints {
    return {
      destinationPortSystemId: connection.destinationPortSystemId,
      destinationSystemId: connection.destinationSystemId,
      sourcePortSystemId: connection.sourcePortSystemId,
      sourceSystemId: connection.sourceSystemId,
    };
  }

  function isInterSubgraphConnection(
    graphData: NonNullable<GraphDesignerStore['graphData']>,
    connection: GraphDesignerStore['excludedLinks'][number],
  ): boolean {
    const sourceSubgraphId =
      graphData.moduleInstances[connection.sourceSystemId]?.subgraphSystemId;
    const destinationSubgraphId =
      graphData.moduleInstances[connection.destinationSystemId]
        ?.subgraphSystemId;

    return Boolean(
      sourceSubgraphId &&
      destinationSubgraphId &&
      sourceSubgraphId !== destinationSubgraphId,
    );
  }

  function dedupeConnections(
    connections: GraphDesignerStore['excludedLinks'],
  ): GraphDesignerStore['excludedLinks'] {
    const seenConnectionIds = new Set<string>();
    return connections.filter((connection) => {
      if (seenConnectionIds.has(connection.systemId)) {
        return false;
      }
      seenConnectionIds.add(connection.systemId);
      return true;
    });
  }

  function removeSubgraphFromUiCacheOnly(
    get: () => GraphDesignerStore,
    subgraphId: string,
  ): void {
    const {graphData, mode} = get();
    if (mode !== 'edit' || !graphData?.subgraphs[subgraphId]) {
      return;
    }

    const droppedModuleIds = new Set<string>();
    const moduleInstances: typeof graphData.moduleInstances = {};
    for (const [id, m] of Object.entries(graphData.moduleInstances)) {
      if (m.subgraphSystemId === subgraphId) {
        droppedModuleIds.add(id);
        continue;
      }
      moduleInstances[id] = m;
    }

    const touchesDroppedModule = (
      c: GraphDesignerStore['excludedLinks'][number],
    ): boolean =>
      droppedModuleIds.has(c.sourceSystemId) ||
      droppedModuleIds.has(c.destinationSystemId);

    const removedConnections =
      graphData.connections.filter(touchesDroppedModule);
    const connections = graphData.connections.filter(
      (c) => !touchesDroppedModule(c),
    );

    const {excludedLinks} = get();
    const removedExcludedLinks = excludedLinks.filter(touchesDroppedModule);
    const survivingExcludedLinks = excludedLinks.filter(
      (c) => !touchesDroppedModule(c),
    );

    const containers: typeof graphData.containers = {};
    for (const [id, c] of Object.entries(graphData.containers)) {
      if (c.subgraphSystemId === subgraphId) {
        continue;
      }
      containers[id] = c;
    }

    const {[subgraphId]: _removed, ...subgraphs} = graphData.subgraphs;

    set((s) => ({
      excludedLinks: survivingExcludedLinks,
      graphData: s.graphData && {
        ...s.graphData,
        connections,
        containers,
        moduleInstances,
        subgraphs,
      },
    }));

    get().adjustSurvivingPortCounts(
      [],
      [...removedConnections, ...removedExcludedLinks]
        .filter(
          (connection, index, self) =>
            self.findIndex((c) => c.systemId === connection.systemId) === index,
        )
        .map(connectionToLinkEndpoints),
    );
    get().pruneSessionLocalMapsForSubgraph(subgraphId);
  }

  async function mergePairLinks(
    get: () => GraphDesignerStore,
    subgraphId: string,
  ): Promise<void> {
    const result = await getSubgraphPairs(projectId, subgraphId);
    if (hasBlockingIssues(result) || !result.data) {
      showToast(
        getIssueMessage(
          result,
          'Could not load linked-subgraph connections for this subgraph',
        ),
        'danger',
      );
      return;
    }

    const {graphData, mode} = get();
    if (mode !== 'edit' || !graphData?.subgraphs[subgraphId]) {
      return;
    }

    let connections = graphData.connections;
    const pairLinksById = {...get().pairLinksById};
    const addedLinks: Array<ControlLinkDto | DataLinkDto> = [];
    const excludableLinkSystemIds = new Set(get().excludableLinkSystemIds);

    const fetchedPairLinksById: Record<string, SubgraphPairResponseDto> = {};

    for (const {link} of result.data.dataLinks) {
      const sourceSubgraphSystemId =
        graphData.moduleInstances[link.sourceSystemId]?.subgraphSystemId;
      const destinationSubgraphSystemId =
        graphData.moduleInstances[link.destinationSystemId]?.subgraphSystemId;
      if (
        !sourceSubgraphSystemId ||
        !destinationSubgraphSystemId ||
        sourceSubgraphSystemId === destinationSubgraphSystemId
      ) {
        continue;
      }

      const otherId =
        sourceSubgraphSystemId === subgraphId
          ? destinationSubgraphSystemId
          : destinationSubgraphSystemId === subgraphId
            ? sourceSubgraphSystemId
            : null;
      if (!otherId) {
        continue;
      }
      if (!(otherId in graphData.subgraphs)) {
        continue;
      }

      const pairKey = `${sourceSubgraphSystemId}:${destinationSubgraphSystemId}`;
      const pair = fetchedPairLinksById[pairKey] ?? {
        controlLinks: [],
        dataLinks: [],
        destinationSubgraphSystemId,
        sourceSubgraphSystemId,
      };
      pair.dataLinks.push(link);
      fetchedPairLinksById[pairKey] = pair;
    }

    for (const {link} of result.data.controlLinks) {
      const sourceSubgraphSystemId =
        graphData.moduleInstances[link.sourceSystemId]?.subgraphSystemId;
      const destinationSubgraphSystemId =
        graphData.moduleInstances[link.destinationSystemId]?.subgraphSystemId;
      if (
        !sourceSubgraphSystemId ||
        !destinationSubgraphSystemId ||
        sourceSubgraphSystemId === destinationSubgraphSystemId
      ) {
        continue;
      }

      const otherId =
        sourceSubgraphSystemId === subgraphId
          ? destinationSubgraphSystemId
          : destinationSubgraphSystemId === subgraphId
            ? sourceSubgraphSystemId
            : null;
      if (!otherId) {
        continue;
      }
      if (!(otherId in graphData.subgraphs)) {
        continue;
      }

      const pairKey = `${sourceSubgraphSystemId}:${destinationSubgraphSystemId}`;
      const pair = fetchedPairLinksById[pairKey] ?? {
        controlLinks: [],
        dataLinks: [],
        destinationSubgraphSystemId,
        sourceSubgraphSystemId,
      };
      pair.controlLinks.push({
        ...link,
        linkType: toControlLinkType(link.linkType),
      });
      fetchedPairLinksById[pairKey] = pair;
    }

    for (const [pairKey, pair] of Object.entries(fetchedPairLinksById)) {
      pairLinksById[pairKey] = pair;
      for (const link of pair.dataLinks) {
        connections = upsertLink(connections, link, 'data');
        addedLinks.push(link);
        excludableLinkSystemIds.add(link.systemId);
      }
      for (const link of pair.controlLinks) {
        connections = upsertLink(connections, link, 'control');
        addedLinks.push(link);
        excludableLinkSystemIds.add(link.systemId);
      }
    }

    set((s) => ({
      excludableLinkSystemIds: [...excludableLinkSystemIds],
      graphData: s.graphData && {...s.graphData, connections},
      pairLinksById,
    }));

    get().adjustSurvivingPortCounts(addedLinks, []);
  }

  async function deleteSubgraphInner(
    get: () => GraphDesignerStore,
    subgraphId: string,
    options?: InnerActionOptions,
  ): Promise<boolean> {
    const provenance = get().subgraphProvenanceById[subgraphId];
    if (provenance === 'palette-placed') {
      removeSubgraphFromUiCacheOnly(get, subgraphId);
      return true;
    }

    const moduleIds = Object.values(get().graphData!.moduleInstances)
      .filter((m) => m.subgraphSystemId === subgraphId)
      .map((m) => m.systemId);

    for (const moduleId of moduleIds) {
      const result = await deleteSpfModule(projectId, moduleId);
      if (hasBlockingIssues(result) || !result.data) {
        if (!options?.suppressToast) {
          showToast(
            getIssueMessage(result, 'Failed to delete subgraph'),
            'danger',
          );
        }
        return false;
      }

      await get().applyComponentCollection({
        added: EMPTY_COLLECTION,
        deleted: toDeletedIdsCollection(result.data),
        updated: EMPTY_COLLECTION,
      });
    }

    return true;
  }

  return {
    deleteSubgraph: (get, subgraphId) =>
      withMutationLock(get, () => deleteSubgraphInner(get, subgraphId)),

    deleteSubgraphInner,

    excludeLink: (get, connectionId) => {
      const {graphData} = get();
      if (!graphData) {
        return;
      }
      const connection = graphData.connections.find(
        (c) => c.systemId === connectionId,
      );
      if (!connection) {
        return;
      }
      set((s) => ({
        excludedLinks: [...s.excludedLinks, connection],
        graphData: s.graphData && {
          ...s.graphData,
          connections: s.graphData.connections.filter(
            (c) => c.systemId !== connectionId,
          ),
        },
      }));
      get().markDirty();
    },

    excludeSubgraph: (get, subgraphId) => {
      const {
        excludableLinkSystemIds,
        excludedSubgraphSystemIds,
        graphData,
        subgraphProvenanceById,
      } = get();
      const provenance = subgraphProvenanceById[subgraphId];
      if (
        !graphData ||
        !graphData.subgraphs[subgraphId] ||
        excludedSubgraphSystemIds.includes(subgraphId) ||
        (provenance !== 'pre-loaded' && provenance !== 'palette-placed')
      ) {
        return;
      }

      const moduleIds = new Set(
        Object.values(graphData.moduleInstances)
          .filter((module) => module.subgraphSystemId === subgraphId)
          .map((module) => module.systemId),
      );
      const removedConnections = graphData.connections.filter(
        (connection) =>
          moduleIds.has(connection.sourceSystemId) ||
          moduleIds.has(connection.destinationSystemId),
      );
      const excludableIds = new Set(excludableLinkSystemIds);
      const excludedConnections = removedConnections.filter(
        (connection) =>
          excludableIds.has(connection.systemId) &&
          isInterSubgraphConnection(graphData, connection),
      );
      const removedConnectionIds = new Set(
        removedConnections.map((connection) => connection.systemId),
      );

      const moduleInstances: typeof graphData.moduleInstances = {};
      for (const [id, module] of Object.entries(graphData.moduleInstances)) {
        if (!moduleIds.has(id)) {
          moduleInstances[id] = module;
        }
      }

      const containers: typeof graphData.containers = {};
      for (const [id, container] of Object.entries(graphData.containers)) {
        if (container.subgraphSystemId !== subgraphId) {
          containers[id] = container;
        }
      }

      const {[subgraphId]: _removedSubgraph, ...subgraphs} =
        graphData.subgraphs;
      const currentKvSelectionsById = get().kvSelectionsById;
      const {[subgraphId]: _removedKv, ...kvSelectionsById} =
        currentKvSelectionsById;
      const {[subgraphId]: _removedProvenance, ...nextProvenance} =
        subgraphProvenanceById;
      const currentPairLinksById = get().pairLinksById;
      const pairLinksById: typeof currentPairLinksById = {};
      for (const [pairKey, pair] of Object.entries(currentPairLinksById)) {
        if (
          pair.sourceSubgraphSystemId !== subgraphId &&
          pair.destinationSubgraphSystemId !== subgraphId
        ) {
          pairLinksById[pairKey] = pair;
        }
      }

      set((state) => ({
        excludedLinks: dedupeConnections([
          ...state.excludedLinks,
          ...excludedConnections,
        ]),
        excludedSubgraphSystemIds: [
          ...state.excludedSubgraphSystemIds,
          subgraphId,
        ],
        graphData: state.graphData && {
          ...state.graphData,
          connections: state.graphData.connections.filter(
            (connection) => !removedConnectionIds.has(connection.systemId),
          ),
          containers,
          moduleInstances,
          subgraphs,
        },
        kvSelectionsById,
        pairLinksById,
        subgraphProvenanceById: nextProvenance,
      }));

      get().adjustSurvivingPortCounts(
        [],
        removedConnections.map(connectionToLinkEndpoints),
      );
      get().markDirty();
    },

    placeSubgraphFromPalette: (get, subgraphId, position) =>
      withMutationLock(get, async () => {
        const result = await getSubgraphContents(projectId, subgraphId);
        if (hasBlockingIssues(result) || !result.data) {
          showToast(
            getIssueMessage(result, 'Failed to load subgraph contents'),
            'danger',
          );
          return false;
        }

        const contents = result.data;
        if (contents.spfModules.length === 0) {
          showToast('Subgraph has no modules and cannot be placed', 'danger');
          return false;
        }

        const defModuleTypeById = new Map(
          get().moduleList.map((d) => [
            d.moduleDefinitionSystemId,
            d.moduleType,
          ]),
        );

        set((s) => {
          if (!s.graphData) {
            return {};
          }
          let moduleInstances = s.graphData.moduleInstances;
          // Connections must be merged before modules are upserted below —
          // upsertModule recomputes activeLinks from this same list
          let connections = s.graphData.connections;
          for (const l of contents.dataLinks) {
            connections = upsertLink(connections, l, 'data');
          }
          for (const l of contents.controlLinks) {
            connections = upsertLink(connections, l, 'control');
          }
          for (const m of contents.spfModules) {
            const isNewModule = !(m.systemId in moduleInstances);
            moduleInstances = upsertModule(
              moduleInstances,
              m,
              defModuleTypeById.get(m.moduleDefinitionSystemId) ?? '',
              connections,
            );
            // A module already on canvas keeps its dragged position;
            // toModuleInstance only defaults to {x: 0, y: 0} for a module
            // that has no prior instance to carry a position forward from.
            if (isNewModule) {
              moduleInstances = {
                ...moduleInstances,
                [m.systemId]: {...moduleInstances[m.systemId], position},
              };
            }
          }
          return {
            graphData: {...s.graphData, connections, moduleInstances},
          };
        });

        await get().recomputeContainersAndSubgraphs();
        get().setSubgraphProvenance(subgraphId, 'palette-placed');
        await mergePairLinks(get, subgraphId);

        return true;
      }),

    reincludeLink: (get, connectionId) => {
      const {excludedLinks} = get();
      const connection = excludedLinks.find((c) => c.systemId === connectionId);
      if (!connection) {
        return;
      }
      set((s) => ({
        excludedLinks: s.excludedLinks.filter(
          (c) => c.systemId !== connectionId,
        ),
        graphData: s.graphData && {
          ...s.graphData,
          connections: [...s.graphData.connections, connection],
        },
      }));
      get().markDirty();
    },

    renameSubgraph: async (get, subgraphId, newName) => {
      await withMutationLock(get, async () => {
        const result = await renameSubgraphApi(projectId, subgraphId, {
          name: newName,
        });
        if (hasBlockingIssues(result) || !result.data) {
          showToast(
            getIssueMessage(result, 'Failed to rename subgraph'),
            'danger',
          );
          return;
        }
        if (result.data.systemId !== subgraphId) {
          logger.warn(
            `subgraph-operations: renameSubgraph response systemId ${result.data.systemId} does not match requested ${subgraphId}, skipping state write`,
            {action: 'renameSubgraph', component: 'subgraphOperations'},
          );
          return;
        }
        const {graphData, subgraphList} = get();
        const hasLocalSubgraph =
          Boolean(graphData?.subgraphs[subgraphId]) ||
          Boolean(
            subgraphList?.some((subgraph) => subgraph.systemId === subgraphId),
          );
        if (!hasLocalSubgraph) {
          logger.warn(
            `subgraph-operations: renameSubgraph no local subgraph for ${subgraphId}, skipping state write`,
            {action: 'renameSubgraph', component: 'subgraphOperations'},
          );
          return;
        }

        const name = result.data.name ?? '';
        get().updateSubgraphNameLocal(subgraphId, name);
      });
    },
  };
}
