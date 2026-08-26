/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {deleteSpfModule} from '~entities/spf-modules';
import {
  getSubgraphContents,
  getSubgraphPairs,
  renameSubgraph as renameSubgraphApi,
} from '~entities/usecases';
import type {
  ControlLinkDto,
  DataLinkDto,
} from '~entities/usecases/model/usecase-component.dto';
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
      destinationPortSystemId: connection.toPortId,
      destinationSystemId: connection.toModuleId,
      sourcePortSystemId: connection.fromPortId,
      sourceSystemId: connection.fromModuleId,
    };
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
      if (m.subgraphId === subgraphId) {
        droppedModuleIds.add(id);
        continue;
      }
      moduleInstances[id] = m;
    }

    const touchesDroppedModule = (
      c: GraphDesignerStore['excludedLinks'][number],
    ): boolean =>
      droppedModuleIds.has(c.fromModuleId) ||
      droppedModuleIds.has(c.toModuleId);

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
      if (c.subgraphId === subgraphId) {
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
            self.findIndex(
              (c) => c.connectionId === connection.connectionId,
            ) === index,
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
    if (!result.success || !result.data) {
      showToast(
        result.message ??
          'Could not load linked-subgraph connections for this subgraph',
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

    for (const pair of result.data) {
      const otherId =
        pair.sourceSubgraphSystemId === subgraphId
          ? pair.destinationSubgraphSystemId
          : pair.sourceSubgraphSystemId;
      if (!(otherId in graphData.subgraphs)) {
        continue;
      }

      const pairKey = `${pair.sourceSubgraphSystemId}:${pair.destinationSubgraphSystemId}`;
      pairLinksById[pairKey] = pair;

      for (const link of pair.dataLinks) {
        connections = upsertLink(connections, link, 'data');
        addedLinks.push(link);
      }
      for (const link of pair.controlLinks) {
        connections = upsertLink(connections, link, 'control');
        addedLinks.push(link);
      }
    }

    set((s) => ({
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
      .filter((m) => m.subgraphId === subgraphId)
      .map((m) => m.moduleInstanceId);

    for (const moduleId of moduleIds) {
      const result = await deleteSpfModule(projectId, moduleId);
      if (!result.success || !result.data) {
        if (!options?.suppressToast) {
          showToast(result.message ?? 'Failed to delete subgraph', 'danger');
        }
        return false;
      }

      const {deleted} = result.data;
      await get().applyComponentCollection({
        added: EMPTY_COLLECTION,
        deleted: {
          controlLinks: deleted.controlLinks ?? [],
          dataLinks: deleted.dataLinks ?? [],
          spfModules: deleted.spfModules ?? [],
          subgraphs: deleted.subgraphs ?? [],
        },
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
        (c) => c.connectionId === connectionId,
      );
      if (!connection) {
        return;
      }
      set((s) => ({
        excludedLinks: [...s.excludedLinks, connection],
        graphData: s.graphData && {
          ...s.graphData,
          connections: s.graphData.connections.filter(
            (c) => c.connectionId !== connectionId,
          ),
        },
      }));
      get().markDirty();
    },

    placeSubgraphFromPalette: (get, subgraphId, position) =>
      withMutationLock(get, async () => {
        const result = await getSubgraphContents(projectId, subgraphId);
        if (!result.success || !result.data) {
          showToast(
            result.message ?? 'Failed to load subgraph contents',
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
          get().moduleList.map((d) => [d.moduleId, d.moduleType]),
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
              defModuleTypeById.get(String(m.moduleId)) ?? '',
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
      const connection = excludedLinks.find(
        (c) => c.connectionId === connectionId,
      );
      if (!connection) {
        return;
      }
      set((s) => ({
        excludedLinks: s.excludedLinks.filter(
          (c) => c.connectionId !== connectionId,
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
        if (!result.success || !result.data) {
          showToast(result.message ?? 'Failed to rename subgraph', 'danger');
          return;
        }
        if (result.data.systemId !== subgraphId) {
          logger.warn(
            `subgraph-operations: renameSubgraph response systemId ${result.data.systemId} does not match requested ${subgraphId}, skipping state write`,
            {action: 'renameSubgraph', component: 'subgraphOperations'},
          );
          return;
        }
        if (!get().graphData?.subgraphs[subgraphId]) {
          logger.warn(
            `subgraph-operations: renameSubgraph no local subgraph for ${subgraphId}, skipping state write`,
            {action: 'renameSubgraph', component: 'subgraphOperations'},
          );
          return;
        }

        const {name} = result.data;
        set((s) => ({
          graphData: s.graphData && {
            ...s.graphData,
            subgraphs: {
              ...s.graphData.subgraphs,
              [subgraphId]: {
                ...s.graphData.subgraphs[subgraphId],
                subgraphName: name,
              },
            },
          },
        }));
        get().markDirty();
      });
    },
  };
}
