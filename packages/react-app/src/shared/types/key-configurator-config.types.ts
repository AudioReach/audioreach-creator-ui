/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface Key {
  id: number;
  name: string;
}

export interface GraphKey extends Key {
  values: KeyValue[];
}

export interface KeyValue {
  id: number;
  name: string;
}

export type SortColumn = 'id' | 'name' | null;
export type SortOrder = 'asc' | 'desc';
