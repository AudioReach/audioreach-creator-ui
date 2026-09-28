/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type BitFieldDto,
  type ConfigElementDto,
  getArrayTemplateElements,
  getArrayValueElements,
  getElementList,
  getStructValueElements,
  type NameValueDto,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {PropertyDto, PropertyElement} from '~shared/lib/property.dto';

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

function isNameValue(value: BitFieldDto | NameValueDto): value is NameValueDto {
  return !('bitMask' in value);
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
    collectConfigElements(property.elements ?? []).some(
      (element) => element.name === name,
    ),
  );
}

export function toNameValueOptions(
  element: ConfigElementDto | null,
): Array<{label: string; value: string}> {
  return (element?.allowedValues ?? []).filter(isNameValue).map((value) => ({
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
