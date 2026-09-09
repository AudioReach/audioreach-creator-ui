/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Copy} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

export interface CopyableIdProps {
  label: string;
  value: string;
}

export function CopyableId({label, value}: CopyableIdProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate font-mono text-xs">{value}</span>
      <Tooltip
        trigger={
          <IconButton
            aria-label={`Copy ${label}`}
            emphasis="neutral"
            icon={Copy}
            onClick={() => void navigator.clipboard.writeText(value)}
            size="sm"
            variant="ghost"
          />
        }
      >
        Copy
      </Tooltip>
    </span>
  );
}
