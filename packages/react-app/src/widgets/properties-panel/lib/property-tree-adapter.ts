/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  getElementList,
  type AnyElementDto,
  type ConfigElementDto,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {
  PropertyDto,
  UpdatePropertyRequestDto,
} from '~shared/lib/property.dto';

import {collectConfigElements} from './schema-property-fields';

export function propertyHasConfigName(
  property: PropertyDto,
  name: string,
): boolean {
  return collectConfigElements(property.elements ?? []).some(
    (element) => element.name === name,
  );
}

export function findPropertyConfigElement(
  properties: PropertyDto[],
  name: string,
): ConfigElementDto | null {
  for (const property of properties) {
    const element = collectConfigElements(property.elements ?? []).find(
      (candidate) => candidate.name === name,
    );
    if (element) {
      return element;
    }
  }

  return null;
}

export function propertyDtosToTreeViewData(
  systemId: string,
  properties: PropertyDto[],
  source: 'get' | 'set' = 'get',
): TreeViewData {
  return {
    items: properties.map((property) => ({
      elements: getElementList(property.elements),
      id: String(property.naturalId),
      name: property.propertyName,
      systemId: property.systemId,
    })),
    source,
    systemId,
  };
}

export function dirtyItemsToProperties(
  dirtyItems: TreeViewItem[],
  originalProperties: PropertyDto[],
): PropertyDto[] {
  const byId = new Map(
    originalProperties.map((property) => [
      String(property.naturalId),
      property,
    ]),
  );

  return dirtyItems.flatMap((item) => {
    const original = byId.get(item.id);
    if (original) {
      return [
        {
          elements: item.elements,
          hasDefinition: original.hasDefinition,
          naturalId: original.naturalId,
          propertyName: original.propertyName,
          systemId: original.systemId,
        },
      ];
    }

    return [];
  });
}

// Strip every element to the minimal write-side shape { name, type, value }.
// The backend serializer only reads `type` and `value` from input elements;
// all other fields (dataType, isReadOnly, description, etc.) are resolved
// from the property definition stored in the DB.
type ElementWriteDto = {
  name?: string;
  type: string;
  value: string | ElementWriteDto[];
};

function toWriteElement(element: AnyElementDto): ElementWriteDto {
  if (element.type === 'ConfigElement') {
    return {name: element.name, type: element.type, value: element.value};
  }
  return {
    name: element.name,
    type: element.type,
    value: element.value.map(toWriteElement),
  };
}

export function propertyDtoToUpdateRequest(
  property: PropertyDto,
): UpdatePropertyRequestDto {
  return {
    elements: getElementList(property.elements).map(
      toWriteElement,
    ) as UpdatePropertyRequestDto['elements'],
  };
}
