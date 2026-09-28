/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  AnyElementDto,
  ElementTemplateArrayDto,
  StructDto,
} from '../model/spf-module-common.dto';

export function getElementList(
  elements: AnyElementDto[] | undefined,
): AnyElementDto[] {
  return Array.isArray(elements) ? elements : [];
}

export function getArrayTemplateElements(
  element: ElementTemplateArrayDto,
): AnyElementDto[] {
  return getElementList(element.template);
}

export function getArrayValueElements(
  element: ElementTemplateArrayDto,
): AnyElementDto[] {
  return getElementList(element.value);
}

export function getStructValueElements(element: StructDto): AnyElementDto[] {
  return getElementList(element.value);
}
