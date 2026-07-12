/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {StatusBadge} from '@qualcomm-ui/react/badge';

import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

export function tabBadge(uiState?: GenericTreeViewUiState) {
  if (!uiState) {
    return undefined;
  }
  if (uiState.invalidPaths.length > 0) {
    return <StatusBadge emphasis="danger" size="xs" />;
  }
  if (uiState.dirtyPaths.length > 0) {
    return <StatusBadge className="dirty-pulse" emphasis="warning" size="xs" />;
  }
  if (uiState.setPaths.length > 0) {
    return <StatusBadge emphasis="success" size="xs" />;
  }
  return undefined;
}
