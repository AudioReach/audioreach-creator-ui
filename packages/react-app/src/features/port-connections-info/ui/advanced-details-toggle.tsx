/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Switch} from '@qualcomm-ui/react/switch';

export interface AdvancedDetailsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AdvancedDetailsToggle({
  checked,
  onChange,
}: AdvancedDetailsToggleProps) {
  return (
    <Switch
      checked={checked}
      label="Advanced details"
      onCheckedChange={onChange}
      size="sm"
    />
  );
}
