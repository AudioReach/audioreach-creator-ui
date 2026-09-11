/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LocateFixed, Trash2} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';

import type {Port} from '~features/graph-designer/model/graph-data-slice';
import {CopyableId} from '~shared/controls/copyable-id';
import {PropertyRow} from '~shared/controls/property-row';

import {formatDisplayId} from '../../lib/display-id';
import type {
  VirtualControlLinkRowModel,
  VirtualDataLinkRowModel,
  VirtualMdfModuleRowModel,
} from '../../lib/virtual-link-row-models';

export function ReadOnlyProperty({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <PropertyRow
      isEditing={false}
      label={label}
      mode="text"
      onChange={() => undefined}
      value={value}
    />
  );
}

export function CopyableIdRow({label, value}: {label: string; value: string}) {
  const displayValue = formatDisplayId(value);

  return (
    <div className="grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] items-start gap-3 py-1">
      <span className="pt-1 text-sm font-medium">{label}</span>
      <CopyableId label={label} value={displayValue} />
    </div>
  );
}

export function MissingEntityAlert({message}: {message: string}) {
  return (
    <div className="p-3 text-sm text-[var(--color-text-danger)]" role="alert">
      {message}
    </div>
  );
}

export function PortsList({ports, title}: {ports: Port[]; title: string}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--color-text-secondary)]">
        {title}
      </h4>
      <div className="grid grid-cols-[1fr_1fr_1fr_4rem] gap-2 text-xs">
        <span className="font-semibold">Port Name</span>
        <span className="font-semibold">Port ID</span>
        <span className="font-semibold">Type</span>
        <span className="font-semibold">Static</span>
        {ports.map((port) => (
          <PortCells key={port.portId} port={port} />
        ))}
      </div>
    </div>
  );
}

function PortCells({port}: {port: Port}) {
  return (
    <>
      <span>{port.portName}</span>
      <span>{formatDisplayId(port.portId)}</span>
      <span>{port.portType}</span>
      <span>{port.isStatic ? 'Yes' : 'No'}</span>
    </>
  );
}

export function VirtualDataLinkRow({
  onDelete,
  onNavigate,
  row,
}: {
  onDelete?: (id: string) => void;
  onNavigate?: (nodeId: string) => void;
  row: VirtualDataLinkRowModel;
}) {
  return (
    <div className="space-y-1 border-b border-[var(--color-border-neutral-02)] py-2 last:border-b-0">
      <ReadOnlyProperty
        label="Source Component Info"
        value={`${row.sourceComponent.displayName} (${row.sourceComponent.id})`}
      />
      <ReadOnlyProperty label="Source Port ID" value={row.sourcePortLabel} />
      <ReadOnlyProperty
        label="Destination Component Info"
        value={`${row.destinationComponent.displayName} (${row.destinationComponent.id})`}
      />
      <ReadOnlyProperty
        label="Destination Port ID"
        value={row.destinationPortLabel}
      />
      {onNavigate && onDelete ? (
        <div className="flex justify-end gap-2">
          <IconButton
            aria-label="Navigate to Source"
            icon={LocateFixed}
            onClick={() => onNavigate(row.sourceNodeId)}
            size="sm"
            variant="ghost"
          />
          <IconButton
            aria-label="Navigate to Destination"
            icon={LocateFixed}
            onClick={() => onNavigate(row.destinationNodeId)}
            size="sm"
            variant="ghost"
          />
          <IconButton
            aria-label="Delete Data Link"
            icon={Trash2}
            onClick={() => onDelete(row.deleteId)}
            size="sm"
            variant="ghost"
          />
        </div>
      ) : null}
    </div>
  );
}

export function MdfModuleRow({row}: {row: VirtualMdfModuleRowModel}) {
  return (
    <div className="space-y-1 border-b border-[var(--color-border-neutral-02)] py-2 last:border-b-0">
      <ReadOnlyProperty label="MDF Module" value={row.moduleName} />
      <ReadOnlyProperty
        label="Processing Domain"
        value={row.processingDomain}
      />
      <ReadOnlyProperty
        label="Module ID"
        value={formatDisplayId(row.moduleId)}
      />
    </div>
  );
}

export function VirtualControlLinkRow({
  onDelete,
  onNavigate,
  row,
}: {
  onDelete: (id: string) => void;
  onNavigate: (nodeId: string) => void;
  row: VirtualControlLinkRowModel;
}) {
  return (
    <div className="space-y-1 border-b border-[var(--color-border-neutral-02)] py-2 last:border-b-0">
      <ReadOnlyProperty
        label="Peer1 Component Info"
        value={`${row.peer1Component.displayName} (${row.peer1Component.id})`}
      />
      <ReadOnlyProperty label="Peer1 Port ID" value={row.peer1PortLabel} />
      <ReadOnlyProperty
        label="Peer2 Component Info"
        value={`${row.peer2Component.displayName} (${row.peer2Component.id})`}
      />
      <ReadOnlyProperty label="Peer2 Port ID" value={row.peer2PortLabel} />
      <ReadOnlyProperty label="Intents" value="-" />
      <ReadOnlyProperty label="Heap ID" value="-" />
      <div className="flex justify-end gap-2">
        <IconButton
          aria-label="Navigate to Peer1"
          icon={LocateFixed}
          onClick={() => onNavigate(row.peer1NodeId)}
          size="sm"
          variant="ghost"
        />
        <IconButton
          aria-label="Navigate to Peer2"
          icon={LocateFixed}
          onClick={() => onNavigate(row.peer2NodeId)}
          size="sm"
          variant="ghost"
        />
        <IconButton
          aria-label="Delete Control Link"
          icon={Trash2}
          onClick={() => onDelete(row.deleteId)}
          size="sm"
          variant="ghost"
        />
      </div>
    </div>
  );
}
