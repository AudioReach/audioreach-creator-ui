/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';
import {ChevronDown, ChevronRight} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';

interface CollapsibleCardProps {
  children: ReactNode;
  count?: number;
  isCollapsed?: boolean;
  onToggle?: () => void;
  title: string;
}

export function CollapsibleCard({
  children,
  count,
  isCollapsed = false,
  onToggle,
  title,
}: CollapsibleCardProps) {
  return (
    <section className="rounded-sm border border-[var(--color-border-neutral-02)] bg-[var(--color-background-neutral-01)]">
      <header className="flex min-h-10 items-center gap-2 border-b border-[var(--color-border-neutral-02)] px-3 py-2">
        {onToggle ? (
          <IconButton
            aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
            icon={isCollapsed ? ChevronRight : ChevronDown}
            onClick={onToggle}
            size="sm"
            variant="ghost"
          />
        ) : null}
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {title}
        </h3>
        {count !== undefined ? (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {count}
          </span>
        ) : null}
      </header>
      {!isCollapsed ? <div className="space-y-3 p-3">{children}</div> : null}
    </section>
  );
}
