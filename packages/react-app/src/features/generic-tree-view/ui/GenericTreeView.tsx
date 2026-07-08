/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, useImperativeHandle} from 'react';

import type {GenericTreeViewHandle, GenericTreeViewProps} from '../model/types';

export const GenericTreeView = forwardRef<
  GenericTreeViewHandle,
  GenericTreeViewProps
>(function GenericTreeView(props, ref) {
  useImperativeHandle(ref, () => ({
    getEditedTreeViewItems: () => null,
    getTreeViewData: () => props.data,
    reset: () => {},
  }));
  return null;
});
