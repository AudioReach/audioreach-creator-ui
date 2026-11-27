/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type ConfigElementDto,
  getArrayTemplateElements,
  getArrayValueElements,
  getElementList,
  getStructValueElements,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {PropertyDto, PropertyElement} from '~shared/lib/property.dto';

// propertyName ("Scenario ID") is a display label; the backend's
// ConfigElement.name ("scenario_id") is an internal field name and the
// two don't match, so this property must be identified by its stable
// naturalId instead of by matching a display string against an element.
export const SCENARIO_PROPERTY_ID = 0x08001010;

export function collectConfigElements(
  elements: PropertyElement[] | undefined,
): ConfigElementDto[] {
  return getElementList(elements).flatMap((element) => {
    if (element.type === 'ConfigElement') {
      return [element];
    }

    if (element.type === 'Struct') {
      return collectConfigElements(getStructValueElements(element));
    }

    return [
      ...collectConfigElements(getArrayTemplateElements(element)),
      ...collectConfigElements(getArrayValueElements(element)),
    ];
  });
}

export function dirtyItemsHaveConfigName(
  dirtyItems: TreeViewItem[],
  name: string,
): boolean {
  return dirtyItems.some((item) =>
    collectConfigElements(item.elements).some(
      (element) => element.name === name,
    ),
  );
}

export function findConfigElement(
  data: TreeViewData | null,
  name: string,
): ConfigElementDto | null {
  for (const item of data?.items ?? []) {
    const element = collectConfigElements(item.elements).find(
      (candidate) => candidate.name === name,
    );
    if (element) {
      return element;
    }
  }

  return null;
}

export function findConfigElementByNaturalId(
  data: TreeViewData | null,
  naturalId: number,
): ConfigElementDto | null {
  const item = data?.items.find(
    (candidate) => candidate.id === String(naturalId),
  );
  return item ? (collectConfigElements(item.elements)[0] ?? null) : null;
}

export function buildConfigElementValueDirtyItem(
  data: TreeViewData | null,
  name: string,
  value: string,
): TreeViewItem | null {
  for (const item of data?.items ?? []) {
    const updatedElements = updateConfigElementValue(
      item.elements,
      name,
      value,
    );
    if (updatedElements) {
      return {...item, elements: updatedElements};
    }
  }

  return null;
}

export function propertyDtosHaveConfigName(
  properties: PropertyDto[],
  name: string,
): boolean {
  return properties.some((property) =>
    collectConfigElements(property.elements ?? []).some(
      (element) => element.name === name,
    ),
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

export function findPropertyConfigElementByNaturalId(
  properties: PropertyDto[],
  naturalId: number,
): ConfigElementDto | null {
  const property = properties.find(
    (candidate) => candidate.naturalId === naturalId,
  );
  return property
    ? (collectConfigElements(property.elements ?? [])[0] ?? null)
    : null;
}

export function toNameValueOptions(
  element: ConfigElementDto | null,
): Array<{label: string; value: string}> {
  return (element?.allowedValues ?? []).map((value) => ({
    label: value.name,
    value: value.value,
  }));
}

function updateConfigElementValue(
  elements: PropertyElement[] | undefined,
  name: string,
  value: string,
): PropertyElement[] | null {
  let didUpdate = false;
  const next = getElementList(elements).map((element): PropertyElement => {
    if (element.type === 'ConfigElement') {
      if (element.name !== name) {
        return element;
      }
      didUpdate = true;
      return {...element, value};
    }

    if (element.type === 'Struct') {
      const updatedValue = updateConfigElementValue(
        getStructValueElements(element),
        name,
        value,
      );
      if (!updatedValue) {
        return element;
      }
      didUpdate = true;
      return {...element, value: updatedValue};
    }

    const templateElements = getArrayTemplateElements(element);
    const valueElements = getArrayValueElements(element);
    const updatedTemplate = updateConfigElementValue(
      templateElements,
      name,
      value,
    );
    const updatedValue = updateConfigElementValue(valueElements, name, value);
    if (!updatedTemplate && !updatedValue) {
      return element;
    }
    didUpdate = true;
    return {
      ...element,
      template: updatedTemplate ?? templateElements,
      value: updatedValue ?? valueElements,
    };
  });

  return didUpdate ? next : null;
}
