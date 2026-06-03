/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {useProjectLayoutStore} from '~shared/store/use-project-layout-store';

import {
  DEFAULT_PANEL_STATE,
  usePanelCollapseStore,
} from '../model/use-panel-collapse-store';

// Config for the 3 panel toggle buttons
// visible = icon shown when the panel is currently open
// hidden  = icon shown when the panel is currently collapsed
const PANEL_BUTTONS = [
  {
    hidden: PanelLeftClose,
    label: 'Toggle Left Panel',
    panel: 'left',
    visible: PanelLeftOpen,
  },
  {
    hidden: PanelBottomClose,
    label: 'Toggle Bottom Panel',
    panel: 'bottom',
    visible: PanelBottomOpen,
  },
  {
    hidden: PanelRightClose,
    label: 'Toggle Right Panel',
    panel: 'right',
    visible: PanelRightOpen,
  },
] as const;

export const PanelIconBar = () => {
  const togglePanel = usePanelCollapseStore((s) => s.togglePanel);
  const activeProjectId = useProjectLayoutStore(
    (state) => state.getActiveProjectGroup()?.mainTab.id,
  );
  const visibility = usePanelCollapseStore((state) =>
    activeProjectId
      ? (state.panelStates[activeProjectId] ?? DEFAULT_PANEL_STATE)
      : null,
  );

  if (!activeProjectId) {
    return null;
  }

  return (
    <div className="flex gap-1">
      {PANEL_BUTTONS.map(({hidden, label, panel, visible}) => (
        <Tooltip
          key={panel}
          trigger={
            <InlineIconButton
              aria-label={label}
              icon={visibility?.[panel] ? visible : hidden}
              onClick={() => togglePanel(panel, activeProjectId)}
            />
          }
        >
          {label}
        </Tooltip>
      ))}
    </div>
  );
};
