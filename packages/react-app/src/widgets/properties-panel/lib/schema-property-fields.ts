/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ConfigElementDto,
  NameValuePairDto,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {PropertyDto, PropertyElement} from '~shared/lib/property.dto';

function collectConfigElements(
  elements: PropertyElement[],
): ConfigElementDto[] {
  return elements.flatMap((element) => {
    if (element.type === 'CONFIG_ELEMENT') {
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

function isNameValuePair(value: {type: string}): value is NameValuePairDto {
  return value.type === 'NAME_VALUE_PAIR';
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
    collectConfigElements(property.elements).some(
      (element) => element.name === name,
    ),
  );
}

export function toNameValueOptions(
  element: ConfigElementDto | null,
): Array<{label: string; value: string}> {
  return (element?.allowedValues ?? [])
    .filter(isNameValuePair)
    .map((value) => ({
      label: value.name,
      value: value.value,
    }));
}

function updateConfigElementValue(
  elements: PropertyElement[],
  name: string,
  value: string,
): PropertyElement[] | null {
  let didUpdate = false;
  const next = elements.map((element): PropertyElement => {
    if (element.type === 'CONFIG_ELEMENT') {
      if (element.name !== name) {
        return element;
      }
      didUpdate = true;
      return {...element, value};
    }

    if (element.type === 'STRUCT') {
      const updatedValue = updateConfigElementValue(element.value, name, value);
      if (!updatedValue) {
        return element;
      }
      didUpdate = true;
      return {...element, value: updatedValue};
    }

    const updatedTemplate = updateConfigElementValue(
      element.template,
      name,
      value,
    );
    const updatedValue = updateConfigElementValue(element.value, name, value);
    if (!updatedTemplate && !updatedValue) {
      return element;
    }
    didUpdate = true;
    return {
      ...element,
      template: updatedTemplate ?? element.template,
      value: updatedValue ?? element.value,
    };
  });

  return didUpdate ? next : null;
}
