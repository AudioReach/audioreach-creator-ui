/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {
  PatchPropertiesRequestDto,
  PropertyDto,
  PropertyElement,
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

export function dirtyItemsToPatchPropertiesRequest(
  dirtyItems: TreeViewItem[],
  originalProperties: PropertyDto[],
): PatchPropertiesRequestDto {
  const byId = new Map(
    originalProperties.map((property) => [
      String(property.propertyId),
      property,
    ]),
  );

  return {
    properties: dirtyItems.flatMap((item) => {
      const original = byId.get(item.id);
      if (original) {
        return [{
          elements: item.elements,
          hasDefinition: true,
          propertyId: original.propertyId,
          propertyName: original.propertyName,
          systemId: original.systemId,
        }];
      }

      return [];
    }),
  };
}
