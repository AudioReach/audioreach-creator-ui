/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ChangeInfoDto,
  ParameterDetailDto,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';

interface ParamContainerDto {
  changeInfo: ChangeInfoDto;
  parameters: ParameterDetailDto[];
  systemId: string;
}

interface ParamUpdateRequest {
  data: ParameterDetailDto[];
}

function paramToTreeViewItem(param: ParameterDetailDto): TreeViewItem {
  return {
    changeInfo: param.changeInfo,
    deprecated: param.deprecated,
    description: param.description,
    elements: param.elements,
    id: param.parameterId,
    isHidden: param.isHidden,
    isNeuralNet: param.isNeuralNet,
    isOffloaded: param.isOffloaded,
    isReadOnly: param.isReadOnly,
    name: param.name,
    toolPolicy: param.toolPolicy,
  };
}

export function paramContainerToTreeViewData(
  dto: ParamContainerDto,
  source?: 'get' | 'set',
): TreeViewData {
  return {
    changeInfo: dto.changeInfo,
    items: dto.parameters.map(paramToTreeViewItem),
    source,
    systemId: dto.systemId,
  };
}

export function dirtyItemsToParamUpdateRequest(
  dirtyItems: TreeViewItem[],
  originalParams: ParameterDetailDto[],
): ParamUpdateRequest {
  const byId = new Map(originalParams.map((p) => [p.parameterId, p]));
  return {
    data: dirtyItems.map((item) => {
      const original = byId.get(item.id);
      return {
        systemId: item.id,
        ...original,
        changeInfo: {changeType: 'UPDATE'},
        elements: item.elements,
        name: item.name,
        parameterId: item.id,
      };
    }),
  };
}
