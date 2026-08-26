/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {SegmentedControl} from '@qualcomm-ui/react/segmented-control';

import type {ConnectionFilter} from '../model/port-connections-info.types';

export interface ConnectionsFilterProps {
  onChange: (filter: ConnectionFilter) => void;
  value: ConnectionFilter;
}

export function ConnectionsFilter({onChange, value}: ConnectionsFilterProps) {
  return (
    <SegmentedControl.Root
      onValueChange={(next) => {
        const selected = next?.[0];
        if (selected) {
          onChange(selected as ConnectionFilter);
        }
      }}
      size="sm"
      value={[value]}
      variant="primary"
    >
      <SegmentedControl.Item text="All" value="all" />
      <SegmentedControl.Item text="Subgraph" value="sg" />
      <SegmentedControl.Item text="Dangling" value="dangling" />
    </SegmentedControl.Root>
  );
}
