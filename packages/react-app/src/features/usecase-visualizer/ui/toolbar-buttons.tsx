/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button, IconButton} from '@qualcomm-ui/react/button';

import type {
  ContextMenuItem,
  ContextMenuTarget,
} from '../model/visualizer.types';

export function ToolbarButtons({
  items,
  onAction,
  target,
}: {
  items: ContextMenuItem[];
  onAction: (actionId: string, target: ContextMenuTarget) => void;
  target: ContextMenuTarget;
}) {
  return items.map(({disabled, icon, id, label, tooltip}) => {
    const props = {
      disabled,
      onClick: () => onAction(id, target),
      size: 'sm',
      title: tooltip ?? label,
      variant: 'ghost',
    } as const;
    return icon ? (
      <IconButton
        key={id}
        {...props}
        aria-label={label}
        emphasis={id === 'delete' ? 'danger' : 'neutral'}
        icon={icon}
      />
    ) : (
      <Button key={id} {...props}>
        {label}
      </Button>
    );
  });
}
