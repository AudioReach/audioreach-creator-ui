/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import type {IJsonModel} from 'flexlayout-react';

import type {OnProjectClose, OnTabClose, PanelTab} from './panel-types';

// ── ID generator ──────────────────────────────────────────────────────────

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ── Entity classes ─────────────────────────────────────────────────────────

/** Main tab for a project group — holds the inner FlexLayout. */
export class ProjectMainTabEntity {
  id: string;
  onTabClose?: OnTabClose;
  panelLayout: {flexLayoutData: IJsonModel};
  title: string;

  constructor(
    title: string,
    panelLayout: {flexLayoutData: IJsonModel},
    onTabClose?: OnTabClose,
  ) {
    this.id = generateId('project-main');
    this.title = title;
    this.panelLayout = panelLayout;
    this.onTabClose = onTabClose;
  }
}

/** Secondary tab within a project group (simple component or inner FlexLayout). */
export class ProjectTabEntity {
  component?: ReactNode;
  id: string;
  onProjectClose?: OnProjectClose;
  onTabClose?: OnTabClose;
  panelLayout?: {flexLayoutData: IJsonModel};
  title: string;

  constructor(
    title: string,
    panelLayoutOrComponent?: {flexLayoutData: IJsonModel} | ReactNode,
    onTabClose?: OnTabClose,
    onProjectClose?: OnProjectClose,
  ) {
    this.id = generateId('project-tab');
    this.title = title;
    this.onTabClose = onTabClose;
    this.onProjectClose = onProjectClose;

    if (
      panelLayoutOrComponent &&
      typeof panelLayoutOrComponent === 'object' &&
      'flexLayoutData' in panelLayoutOrComponent
    ) {
      this.panelLayout = panelLayoutOrComponent as {flexLayoutData: IJsonModel};
      this.component = undefined;
    } else {
      this.component = panelLayoutOrComponent as ReactNode;
      this.panelLayout = undefined;
    }
  }
}

/** Individual panel tab (e.g. Log View, Key Configurator) inside a project tab's FlexLayout. */
export class PanelTabEntity implements PanelTab {
  component: ReactNode;
  id: string;
  onProjectClose?: OnProjectClose;
  onTabClose?: OnTabClose;
  title: string;

  constructor(
    title: string,
    component: ReactNode,
    onTabClose?: OnTabClose,
    onProjectClose?: OnProjectClose,
  ) {
    this.id = generateId('panel-tab');
    this.title = title;
    this.component = component;
    this.onTabClose = onTabClose;
    this.onProjectClose = onProjectClose;
  }
}
