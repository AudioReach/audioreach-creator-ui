/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  ChevronDown,
  ChevronUp,
  List,
  MonitorSpeaker,
  Search,
} from 'lucide-react';

import {Button} from '@qualcomm-ui/react/button';
import {Divider} from '@qualcomm-ui/react/divider';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {SegmentedControl} from '@qualcomm-ui/react/segmented-control';
import {Switch} from '@qualcomm-ui/react/switch';
import {TextInput} from '@qualcomm-ui/react/text-input';

interface ToolbarProps {
  dirtyPaths: Set<string>;
  invalidPaths: Set<string>;
  isExpanding?: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onPolicyFilterChange: (filter: Set<'BASIC' | 'ADVANCED'>) => void;
  onSearchChange: (text: string) => void;
  onShowBadgesChange: (show: boolean) => void;
  onShowErrorsOnlyChange: (show: boolean) => void;
  onShowModifiedOnlyChange: (show: boolean) => void;
  onShowPidsChange: (show: boolean) => void;
  onShowRangesChange: (show: boolean) => void;
  onViewModeChange: (mode: 'legacy' | 'modern') => void;
  policyFilter: Set<'BASIC' | 'ADVANCED'>;
  searchText: string;
  showBadges: boolean;
  showErrorsOnly: boolean;
  showModifiedOnly: boolean;
  showPids: boolean;
  showRanges: boolean;
  viewMode: 'legacy' | 'modern';
}

export function Toolbar({
  dirtyPaths,
  invalidPaths,
  isExpanding = false,
  onCollapseAll,
  onExpandAll,
  onPolicyFilterChange,
  onSearchChange,
  onShowBadgesChange,
  onShowErrorsOnlyChange,
  onShowModifiedOnlyChange,
  onShowPidsChange,
  onShowRangesChange,
  onViewModeChange,
  policyFilter,
  searchText,
  showBadges,
  showErrorsOnly,
  showModifiedOnly,
  showPids,
  showRanges,
  viewMode,
}: ToolbarProps) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-1"
      style={{backgroundColor: 'var(--color-surface-primary)'}}
    >
      <TextInput
        aria-label="Search"
        className="w-64"
        clearable
        onValueChange={onSearchChange}
        placeholder="Search…"
        size="sm"
        startIcon={Search}
        value={searchText}
      />

      <Divider className="mx-0.5 h-5" orientation="vertical" />

      <SegmentedControl.Root
        multiple
        onValueChange={(values: string[] | null | undefined) =>
          onPolicyFilterChange(
            new Set((values ?? []) as ('ADVANCED' | 'BASIC')[]),
          )
        }
        size="sm"
        value={Array.from(policyFilter)}
        variant="primary"
      >
        <SegmentedControl.Item text="Basic" value="BASIC" />
        <SegmentedControl.Item text="Advanced" value="ADVANCED" />
      </SegmentedControl.Root>

      <Divider className="mx-0.5 h-5" orientation="vertical" />

      <Button onClick={onCollapseAll} size="sm" variant="ghost">
        <ChevronUp size={12} />
        Collapse All
      </Button>
      <Button
        disabled={isExpanding}
        onClick={onExpandAll}
        size="sm"
        variant="ghost"
      >
        {isExpanding ? <ProgressRing size="xxs" /> : <ChevronDown size={12} />}
        Expand All
      </Button>

      <Divider className="mx-0.5 h-5" orientation="vertical" />

      <Button
        onClick={() =>
          onViewModeChange(viewMode === 'modern' ? 'legacy' : 'modern')
        }
        size="sm"
        variant="ghost"
      >
        {viewMode === 'modern' ? (
          <>
            <List size={12} />
            Legacy
          </>
        ) : (
          <>
            <MonitorSpeaker size={12} />
            Modern
          </>
        )}
      </Button>

      <Divider className="mx-0.5 h-5" orientation="vertical" />

      {viewMode === 'modern' &&
        (
          [
            {checked: showPids, label: 'PIDs', onChange: onShowPidsChange},
            {
              checked: showRanges,
              label: 'Ranges',
              onChange: onShowRangesChange,
            },
            {
              checked: showBadges,
              label: 'Badges',
              onChange: onShowBadgesChange,
            },
          ] as const
        ).map(({checked, label, onChange}) => (
          <Switch
            key={label}
            checked={checked}
            label={label}
            onCheckedChange={onChange}
            size="sm"
          />
        ))}

      {viewMode === 'modern' && dirtyPaths.size > 0 && (
        <Switch
          checked={showModifiedOnly}
          label="Modified Only"
          onCheckedChange={onShowModifiedOnlyChange}
          size="sm"
        />
      )}
      {viewMode === 'modern' && invalidPaths.size > 0 && (
        <Switch
          checked={showErrorsOnly}
          label="Errors Only"
          onCheckedChange={onShowErrorsOnlyChange}
          size="sm"
        />
      )}

      <div className="flex-1" />
    </div>
  );
}
