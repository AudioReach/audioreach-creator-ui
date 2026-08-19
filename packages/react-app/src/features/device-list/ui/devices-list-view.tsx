/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Smartphone} from 'lucide-react';

import type DeviceInfo from '~shared/types/device-info.types';

interface DevicesListViewProps {
  devices: DeviceInfo[];
  onOpenDevice: (device: DeviceInfo) => void;
}

export default function DevicesListView({
  devices,
  onOpenDevice,
}: DevicesListViewProps) {
  if (devices.length === 0) {
    return (
      <div className="text-neutral-secondary flex flex-col items-center justify-center py-12">
        <Smartphone className="mb-4" size={48} />
        <p className="text-lg">No devices found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => (
        <div
          key={device.id}
          className="bg-raised border-neutral-02 hover:bg-neutral-hover flex cursor-pointer items-center gap-4 rounded border p-3 transition-colors"
          onClick={() => onOpenDevice(device)}
        >
          {/* Icon */}
          <Smartphone className="text-neutral-primary" size={24} />

          {/* Device Info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-neutral-primary truncate font-semibold">
              {device.name}
            </h3>
            <p className="text-neutral-secondary truncate text-sm">
              {device.description || 'No description'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
