/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

// ── Callback types ─────────────────────────────────────────────────────────

export type OnTabClose = (
  tabId: string,
  tabName: string,
) => Promise<boolean> | boolean;

export type OnProjectClose = (tabId: string, tabName: string) => void;

// ── Panel tab interface ────────────────────────────────────────────────────

export interface PanelTab {
  component: ReactNode;
  id: string;
  onProjectClose?: OnProjectClose;
  onTabClose?: OnTabClose;
  title: string;
}

// ── Panel position enum ────────────────────────────────────────────────────

export enum PanelId {
  CenterPanel,
  TopPanel,
  BottomPanel,
  LeftPanel,
  RightPanel,
}
