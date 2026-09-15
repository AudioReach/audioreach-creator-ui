/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import type {PropertyDto, PropertyElement} from '~shared/lib/property.dto';
import {logger} from '~shared/lib/logger';

export type PropertiesEntityType =
  'container' | 'controlLink' | 'module' | 'subgraph';

export interface PropertiesEntry {
  error: string | null;
  isLoading: boolean;
  properties: PropertyDto[];
  savingPropertySystemIds: string[];
}

interface PropertiesPanelStore {
  applySubgraphVsidUpdate: (
    projectId: string,
    affectedSubgraphSystemIds: string[],
    elements: PropertyElement[],
  ) => void;
  entries: Record<string, PropertiesEntry>;
  evictEntry: (
    projectId: string,
    entityType: PropertiesEntityType,
    entityId: string,
  ) => void;
  replaceProperties: (
    projectId: string,
    entityType: PropertiesEntityType,
    entityId: string,
    properties: PropertyDto[],
  ) => void;
  replaceProperty: (
    projectId: string,
    entityType: PropertiesEntityType,
    entityId: string,
    property: PropertyDto,
  ) => void;
  setEntryError: (
    projectId: string,
    entityType: PropertiesEntityType,
    entityId: string,
    error: string | null,
  ) => void;
  setEntryLoading: (
    projectId: string,
    entityType: PropertiesEntityType,
    entityId: string,
    isLoading: boolean,
  ) => void;
  setPropertySaving: (
    projectId: string,
    entityType: PropertiesEntityType,
    entityId: string,
    propertySystemId: string,
    isSaving: boolean,
  ) => void;
}

const VSID_PROPERTY_ID = 0x080010cc;

export function propertiesEntryKey(
  projectId: string,
  entityType: PropertiesEntityType,
  entityId: string,
): string {
  return `${projectId}:${entityType}:${entityId}`;
}

export const EMPTY_PROPERTIES_ENTRY: PropertiesEntry = {
  error: null,
  isLoading: false,
  properties: [],
  savingPropertySystemIds: [],
};

function getEntry(
  entries: Record<string, PropertiesEntry>,
  key: string,
): PropertiesEntry {
  return entries[key] ?? EMPTY_PROPERTIES_ENTRY;
}

function setEntry(
  entries: Record<string, PropertiesEntry>,
  key: string,
  entry: PropertiesEntry,
): Record<string, PropertiesEntry> {
  return {...entries, [key]: entry};
}

export const usePropertiesPanelStore = create<PropertiesPanelStore>((set) => ({
  applySubgraphVsidUpdate: (projectId, affectedSubgraphSystemIds, elements) => {
    set((state) => {
      const affectedIds = new Set(affectedSubgraphSystemIds);
      const entries = Object.fromEntries(
        Object.entries(state.entries).map(([key, entry]) => {
          const [entryProjectId, entityType, entityId] = key.split(':');
          if (
            entryProjectId !== projectId ||
            entityType !== 'subgraph' ||
            !affectedIds.has(entityId)
          ) {
            return [key, entry];
          }

          return [
            key,
            {
              ...entry,
              properties: entry.properties.map((property) =>
                property.propertyId === VSID_PROPERTY_ID
                  ? {...property, elements}
                  : property,
              ),
            },
          ];
        }),
      );
      logger.debug('Applied cached VSID property update', {
        action: 'properties_panel_vsid_update',
        component: 'PropertiesPanelStore',
        projectId,
      });
      return {entries};
    });
  },
  entries: {},
  evictEntry: (projectId, entityType, entityId) => {
    set((state) => {
      const key = propertiesEntryKey(projectId, entityType, entityId);
      const {[key]: _removed, ...entries} = state.entries;
      logger.debug('Evicted properties entry', {
        action: 'properties_panel_entry_evict',
        component: 'PropertiesPanelStore',
        projectId,
      });
      return {entries};
    });
  },
  replaceProperties: (projectId, entityType, entityId, properties) => {
    set((state) => {
      const key = propertiesEntryKey(projectId, entityType, entityId);
      const entry = getEntry(state.entries, key);
      logger.debug('Replaced properties collection', {
        action: 'properties_panel_properties_replace',
        component: 'PropertiesPanelStore',
        projectId,
      });
      return {
        entries: setEntry(state.entries, key, {
          ...entry,
          error: null,
          properties,
        }),
      };
    });
  },
  replaceProperty: (projectId, entityType, entityId, property) => {
    set((state) => {
      const key = propertiesEntryKey(projectId, entityType, entityId);
      const entry = getEntry(state.entries, key);
      const didReplace = entry.properties.some(
        (candidate) =>
          candidate.systemId === property.systemId ||
          candidate.propertyId === property.propertyId,
      );
      logger.debug('Replaced property', {
        action: 'properties_panel_property_replace',
        component: 'PropertiesPanelStore',
        projectId,
      });
      return {
        entries: setEntry(state.entries, key, {
          ...entry,
          error: null,
          properties: didReplace
            ? entry.properties.map((candidate) =>
                candidate.systemId === property.systemId ||
                candidate.propertyId === property.propertyId
                  ? property
                  : candidate,
              )
            : [...entry.properties, property],
        }),
      };
    });
  },
  setEntryError: (projectId, entityType, entityId, error) => {
    set((state) => {
      const key = propertiesEntryKey(projectId, entityType, entityId);
      const entry = getEntry(state.entries, key);
      return {
        entries: setEntry(state.entries, key, {
          ...entry,
          error,
        }),
      };
    });
  },
  setEntryLoading: (projectId, entityType, entityId, isLoading) => {
    set((state) => {
      const key = propertiesEntryKey(projectId, entityType, entityId);
      const entry = getEntry(state.entries, key);
      return {
        entries: setEntry(state.entries, key, {
          ...entry,
          isLoading,
        }),
      };
    });
  },
  setPropertySaving: (
    projectId,
    entityType,
    entityId,
    propertySystemId,
    isSaving,
  ) => {
    set((state) => {
      const key = propertiesEntryKey(projectId, entityType, entityId);
      const entry = getEntry(state.entries, key);
      const current = entry.savingPropertySystemIds;
      const savingPropertySystemIds = isSaving
        ? Array.from(new Set([...current, propertySystemId]))
        : current.filter((id) => id !== propertySystemId);
      return {
        entries: setEntry(state.entries, key, {
          ...entry,
          savingPropertySystemIds,
        }),
      };
    });
  },
}));
