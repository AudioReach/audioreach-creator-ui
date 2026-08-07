/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Switch} from '@qualcomm-ui/react/switch';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {
  type GraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';

import {selectModuleEnable} from '../../lib/select-module-enable';

interface ModuleEnableOverlayProps {
  moduleInstanceId: string;
}

interface ModuleEnableOverlayState {
  isCkvResolved: boolean;
  isPresent: boolean;
  isReady: boolean;
  setModuleEnable: GraphDesignerStore['setModuleEnable'];
  value: boolean;
}

function selectOverlayState(
  state: GraphDesignerStore,
  moduleInstanceId: string,
): ModuleEnableOverlayState {
  const enable = selectModuleEnable(state, moduleInstanceId);
  return {
    isCkvResolved: enable.isPresent && enable.isCkvResolved,
    isPresent: enable.isPresent,
    isReady: enable.isPresent && enable.isCkvResolved ? enable.isReady : false,
    setModuleEnable: state.setModuleEnable,
    value:
      enable.isPresent && enable.isCkvResolved && enable.isReady
        ? enable.value
        : false,
  };
}

export function ModuleEnableOverlay({
  moduleInstanceId,
}: ModuleEnableOverlayProps) {
  const {isCkvResolved, isPresent, isReady, setModuleEnable, value} =
    useGraphDesignerStoreShallow((state) =>
      selectOverlayState(state, moduleInstanceId),
    );

  if (!isPresent) {
    return null;
  }

  if (!isCkvResolved) {
    return (
      <div
        className="nodrag nopan bg-background-neutral-01/50 absolute inset-0"
        data-testid="module-enable-overlay-unresolved"
        onClick={(event) => event.stopPropagation()}
      >
        <Tooltip
          positioning={{placement: 'top'}}
          trigger={<div className="absolute inset-0" />}
        >
          CKV combination not available for this module — adjust the subgraph
          header selection to enable configuration.
        </Tooltip>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div
        className="nodrag nopan"
        data-testid="module-enable-overlay-loading"
        onClick={(event) => event.stopPropagation()}
      >
        <Switch aria-label="Module enable" checked={false} disabled size="sm" />
      </div>
    );
  }

  return (
    <div
      className="nodrag nopan"
      data-testid="module-enable-overlay-ready"
      onClick={(event) => event.stopPropagation()}
    >
      <Switch
        aria-label="Module enable"
        checked={value}
        onCheckedChange={(isChecked) =>
          setModuleEnable(moduleInstanceId, isChecked)
        }
        size="sm"
      />
    </div>
  );
}
