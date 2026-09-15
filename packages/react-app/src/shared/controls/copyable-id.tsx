/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';
import {Check, Copy} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

export interface CopyableIdProps {
  label: string;
  value: string;
}

const COPIED_TIMEOUT_MS = 1500;

export function CopyableId({label, value}: CopyableIdProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setIsCopied(false),
      COPIED_TIMEOUT_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [isCopied]);

  const copyValue = async () => {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
  };

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate font-mono text-xs">{value}</span>
      <Tooltip
        trigger={
          <IconButton
            aria-label={`Copy ${label}`}
            emphasis="neutral"
            icon={isCopied ? Check : Copy}
            onClick={() => void copyValue()}
            size="sm"
            variant="ghost"
          />
        }
      >
        {isCopied ? 'Copied' : 'Copy'}
      </Tooltip>
    </span>
  );
}
