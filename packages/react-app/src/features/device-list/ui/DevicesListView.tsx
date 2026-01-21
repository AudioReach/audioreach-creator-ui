import {Smartphone} from "lucide-react"

import type ArcDeviceInfo from "~shared/types/arc-device-info"

interface DevicesListViewProps {
  devices: ArcDeviceInfo[]
  onOpenDevice: (device: ArcDeviceInfo) => void
}

export default function DevicesListView({
  devices,
  onOpenDevice,
}: DevicesListViewProps) {
  if (devices.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12"
        style={{color: "var(--color-text-neutral-secondary)"}}
      >
        <Smartphone className="mb-4" size={48} />
        <p className="text-lg">No devices found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => (
        <div
          key={device.id}
          className="flex cursor-pointer items-center gap-4 rounded p-3 transition-colors hover:bg-opacity-10"
          onClick={() => onOpenDevice(device)}
          style={{
            backgroundColor: "var(--color-surface-raised)",
            border: "1px solid var(--color-border-neutral-02)",
          }}
        >
          {/* Icon */}
          <Smartphone
            size={24}
            style={{color: "var(--color-text-neutral-primary)"}}
          />

          {/* Device Info */}
          <div className="min-w-0 flex-1">
            <h3
              className="truncate font-semibold"
              style={{color: "var(--color-text-neutral-primary)"}}
            >
              {device.name}
            </h3>
            <p
              className="truncate text-sm"
              style={{color: "var(--color-text-neutral-secondary)"}}
            >
              {device.description || "No description"}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
