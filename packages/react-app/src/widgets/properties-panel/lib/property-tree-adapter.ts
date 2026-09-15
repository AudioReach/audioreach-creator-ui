/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {
  PropertyDto,
  PropertyElement,
  UpdatePropertyRequestDto,
} from '~shared/lib/property.dto';

type ConfigPropertyElement = Extract<PropertyElement, {type: 'CONFIG_ELEMENT'}>;

function isConfigElement(
  element: PropertyElement,
): element is ConfigPropertyElement {
  return element.type === 'CONFIG_ELEMENT';
}

function collectConfigElements(
  elements: PropertyElement[],
): ConfigPropertyElement[] {
  return elements.flatMap((element) => {
    if (isConfigElement(element)) {
      return [element];
    }

    if (element.type === 'STRUCT') {
      return collectConfigElements(element.value);
    }

    return [
      ...collectConfigElements(element.template),
      ...collectConfigElements(element.value),
    ];
  });
}

export function propertyHasConfigName(
  property: PropertyDto,
  name: string,
): boolean {
  return collectConfigElements(property.elements).some(
    (element) => element.name === name,
  );
}

export function findPropertyConfigElement(
  properties: PropertyDto[],
  name: string,
): ConfigPropertyElement | null {
  for (const property of properties) {
    const element = collectConfigElements(property.elements).find(
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
      elements: property.elements,
      id: String(property.propertyId),
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
      String(property.propertyId),
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
          propertyId: original.propertyId,
          propertyName: original.propertyName,
          systemId: original.systemId,
        },
      ];
    }

    return [];
  });
}

export function propertyDtoToUpdateRequest(
  property: PropertyDto,
): UpdatePropertyRequestDto {
  return {
    elements: property.elements,
    name: property.propertyName,
    systemId: property.systemId,
  };
}
