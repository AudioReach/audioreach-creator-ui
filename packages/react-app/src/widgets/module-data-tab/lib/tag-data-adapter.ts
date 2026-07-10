/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  TagDataDto,
  UpdateSpfModuleTagDataRequest,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';

import {
  dirtyItemsToParamUpdateRequest,
  paramContainerToTreeViewData,
} from './param-tree-view-adapter';

export function tagDataDtoToTreeViewData(
  dto: TagDataDto,
  source?: 'get' | 'set',
): TreeViewData {
  return paramContainerToTreeViewData(dto, source);
}

export function dirtyItemsToTagDataRequest(
  dirtyItems: TreeViewItem[],
  originalDto: TagDataDto,
): UpdateSpfModuleTagDataRequest {
  return dirtyItemsToParamUpdateRequest(dirtyItems, originalDto.parameters);
}
