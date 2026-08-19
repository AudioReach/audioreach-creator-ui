/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ReactNode, useCallback, useEffect, useRef} from 'react';

import {Checkbox} from '@qualcomm-ui/react/checkbox';
import {Radio, RadioGroup} from '@qualcomm-ui/react/radio';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {ConfigFileManager} from '~shared/config/config-manager';
import type {UserPreferences} from '~shared/config/user-preferences-types';
import {showToast} from '~shared/controls/global-toaster';

const SAVE_DEBOUNCE_MS = 300;

interface DisplayOptionsPopoverProps {
  preferences: UserPreferences;
  projectId: string;
  updatePreference: (path: string, value: unknown) => boolean;
}

function Section({
  children,
  divider = true,
  title,
}: {
  children: ReactNode;
  divider?: boolean;
  title: string;
}) {
  return (
    <>
      {divider && <div className="border-neutral-01 border-t" />}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase text-neutral-secondary">
          {title}
        </h3>
        {children}
      </section>
    </>
  );
}

export function DisplayOptionsPopover({
  preferences,
  projectId,
  updatePreference,
}: DisplayOptionsPopoverProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    try {
      const saved = await ConfigFileManager.instance.save(projectId);
      if (!saved) {
        showToast('Failed to save display option', 'danger');
      }
    } catch {
      showToast('Failed to save display option', 'danger');
    }
  }, [projectId]);

  // Popover content unmounts on close (lazyMount/unmountOnExit) — flush
  // rather than cancel, so a change made just before closing is not lost.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        void flushSave();
      }
    };
  }, [flushSave]);

  const savePreference = useCallback(
    (path: string, value: unknown) => {
      if (!updatePreference(path, value)) {
        showToast('Failed to save display option', 'danger');
        return;
      }
      // Debounced — avoids a full config write (and IPC round-trip) on every
      // single checkbox/radio toggle when the user changes several in a row.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        void flushSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [updatePreference, flushSave],
  );

  const {display, usecases, visualization} = preferences;
  const isDetailedView = visualization.viewMode === 'detailed';
  const isUsecaseWorkflow = usecases.workflowType === 'usecase-workflow';
  const isSimplifySubsystemsDisabled =
    isUsecaseWorkflow && usecases.workflowLevel === 'usecase-level';

  return (
    <div className="w-55 flex flex-col gap-4">
      <Section divider={false} title="Graph View">
        <Checkbox
          checked={visualization.highlightPPModules}
          label="Highlight PP Modules"
          onCheckedChange={(checked) =>
            savePreference('visualization.highlightPPModules', checked)
          }
          size="sm"
        />
        <Checkbox
          checked={visualization.showControlLinks}
          label="Show Control Links"
          onCheckedChange={(checked) =>
            savePreference('visualization.showControlLinks', checked)
          }
          size="sm"
        />
        <Checkbox
          checked={visualization.showDanglingLinks}
          label="Show Dangling Links"
          onCheckedChange={(checked) =>
            savePreference('visualization.showDanglingLinks', checked)
          }
          size="sm"
        />
      </Section>

      <Section title="Workflow">
        <RadioGroup
          onValueChange={(value) =>
            value && savePreference('usecases.workflowType', value)
          }
          size="sm"
          value={usecases.workflowType}
        >
          <Radio label="Usecase Workflow" value="usecase-workflow" />
          {isUsecaseWorkflow && (
            <div className="ml-6 flex flex-col gap-1">
              <RadioGroup
                onValueChange={(value) =>
                  value && savePreference('usecases.workflowLevel', value)
                }
                size="sm"
                value={usecases.workflowLevel}
              >
                <Radio label="Subsystem level" value="subsystem-level" />
                <Radio label="Usecase level" value="usecase-level" />
              </RadioGroup>
            </div>
          )}
          <Radio label="System Workflow" value="system-workflow" />
        </RadioGroup>
      </Section>

      <Section title="Graph Display">
        <RadioGroup
          onValueChange={(value) =>
            value && savePreference('visualization.viewMode', value)
          }
          size="sm"
          value={visualization.viewMode}
        >
          <Radio label="Compact View" value="compact" />
          <Radio label="Detailed View" value="detailed" />
        </RadioGroup>
        {isDetailedView && (
          <div className="ml-6 flex flex-col gap-1">
            <Checkbox
              checked={visualization.showSubgraphIds}
              label="Show Subgraph IDs"
              onCheckedChange={(checked) =>
                savePreference('visualization.showSubgraphIds', checked)
              }
              size="sm"
            />
            <Checkbox
              checked={visualization.showContainerIds}
              label="Show Container IDs"
              onCheckedChange={(checked) =>
                savePreference('visualization.showContainerIds', checked)
              }
              size="sm"
            />
            <Checkbox
              checked={visualization.showModuleInstanceIds}
              label="Show Module Instance IDs"
              onCheckedChange={(checked) =>
                savePreference('visualization.showModuleInstanceIds', checked)
              }
              size="sm"
            />
            <Checkbox
              checked={display.portVisibilityMode === 'all'}
              label="Show all ports"
              onCheckedChange={(checked) =>
                savePreference(
                  'display.portVisibilityMode',
                  checked ? 'all' : 'active',
                )
              }
              size="sm"
            />
          </div>
        )}
        <Checkbox
          checked={visualization.expandSubgraphs}
          label="Expand Subgraphs"
          onCheckedChange={(checked) =>
            savePreference('visualization.expandSubgraphs', checked)
          }
          size="sm"
        />
        {isSimplifySubsystemsDisabled ? (
          <Tooltip
            // Force tooltip above the surrounding Popover layer.
            contentProps={{className: 'z-[2000]'}}
            positioning={{placement: 'right'}}
            trigger={
              <span>
                <Checkbox
                  checked={visualization.simplifySubsystems}
                  disabled
                  label="Simplified Subsystems"
                  onCheckedChange={() => {}}
                  size="sm"
                />
              </span>
            }
          >
            Select Subsystem level or System Workflow to enable
          </Tooltip>
        ) : (
          <Checkbox
            checked={visualization.simplifySubsystems}
            label="Simplified Subsystems"
            onCheckedChange={(checked) =>
              savePreference('visualization.simplifySubsystems', checked)
            }
            size="sm"
          />
        )}
        <Checkbox
          checked={visualization.showMdfModules}
          label="Show MDF Modules"
          onCheckedChange={(checked) =>
            savePreference('visualization.showMdfModules', checked)
          }
          size="sm"
        />
      </Section>

      <Section title="Usecase Name">
        <RadioGroup
          onValueChange={(value) =>
            value && savePreference('usecases.namePreference', value)
          }
          size="sm"
          value={usecases.namePreference}
        >
          <Radio label="Alias" value="alias" />
          <Radio label="Key Value(s)" value="keyvalues" />
          <Radio label="Value(s)" value="values" />
        </RadioGroup>
      </Section>
    </div>
  );
}
