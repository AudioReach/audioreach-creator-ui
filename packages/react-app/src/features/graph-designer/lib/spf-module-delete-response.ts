/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {RemoveSpfModuleResponseDto} from '~entities/spf-modules/model/spf-module-crud.dto';

import type {DeletedIdsCollection} from '../model/graph-data-slice';

type DeletedIdLike = {systemId: string} | string;

function ids(items: DeletedIdLike[] | undefined): string[] {
  return (items ?? []).map((item) =>
    typeof item === 'string' ? item : item.systemId,
  );
}

export function toDeletedIdsCollection(
  response: RemoveSpfModuleResponseDto,
): DeletedIdsCollection {
  return {
    controlLinks: ids(response.deleted.controlLinks),
    dataLinks: ids(response.deleted.dataLinks),
    spfModules: ids(response.deleted.spfModules),
    subgraphs: ids(response.deleted.subgraphs),
  };
}
