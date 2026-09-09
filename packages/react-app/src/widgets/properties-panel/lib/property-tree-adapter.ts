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

function isPropertyHidden(property: PropertyDto): boolean {
  if (property.isHidden) {
    return true;
  }

  const configElements = collectConfigElements(property.elements);
  return (
    configElements.length > 0 &&
    configElements.every((element) => element.policy === 'HIDDEN')
  );
}

function isPropertyReadOnly(property: PropertyDto): boolean {
  if (property.isReadOnly) {
    return true;
  }

  const configElements = collectConfigElements(property.elements);
  return (
    configElements.length > 0 &&
    configElements.every((element) => element.isReadOnly)
  );
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
      changeInfo: property.changeInfo,
      description: property.description,
      elements: property.elements,
      id: String(property.propertyId),
      isHidden: isPropertyHidden(property),
      isReadOnly: isPropertyReadOnly(property),
      name: property.propertyName,
      systemId: property.systemId,
      toolPolicy: property.toolPolicy,
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
    properties: dirtyItems.map((item) => {
      const original = byId.get(item.id);

      return {
        ...original,
        changeInfo: {changeType: 'UPDATE'},
        elements: item.elements,
        propertyId: original?.propertyId ?? item.id,
        propertyName: original?.propertyName ?? item.name,
        systemId: original?.systemId ?? item.id,
      };
    }),
  };
}
