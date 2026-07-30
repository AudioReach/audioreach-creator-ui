/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface TabFocusHandler {
  focusTab: (nodeId: string) => void;
}

export class TabFocusRegistry {
  private handler: TabFocusHandler | null = null;

  register(handler: TabFocusHandler): void {
    this.handler = handler;
  }

  focusTab(nodeId: string): void {
    this.handler?.focusTab(nodeId);
  }
}

export function createTabFocusRegistry(): TabFocusRegistry {
  return new TabFocusRegistry();
}

export const tabFocusRegistry = new TabFocusRegistry();
