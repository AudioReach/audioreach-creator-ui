/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface Key {
  id: number;
  name: string;
  systemId: string;
}

export interface GraphKey extends Key {
  values: KeyValue[];
}

export interface KeyValue {
  id: number;
  name: string;
  systemId: string;
}

export interface CkvParameter {
  checked: boolean;
  name: string;
  pid: number;
}

export interface ConfiguredCkv {
  keyValuePairs: Array<{key: GraphKey; value: KeyValue}>;
  pidConfig: number[];
  systemId: string;
}

export interface TagGroup {
  id: number;
  keys: Record<string, GraphKey>;
  name: string;
}

export interface TkvParameter {
  checked: boolean;
  name: string;
  pid: number;
}

export interface ConfiguredTkv {
  keyValuePairs: Array<{key: Key; value: KeyValue}>;
  pidConfig: number[];
  systemId: string;
  tagGroup: string;
  tagGroupId: number;
}

export type SortColumn = 'id' | 'name' | null;
export type SortOrder = 'asc' | 'desc';
