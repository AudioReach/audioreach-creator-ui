import ArcProjectCard from "~shared/controls/arc-project-card"
import type DeviceInfo from "~shared/types/device-info.types"

interface DeviceSectionProps {
  /** List of devices to display in the device list */
  devices?: DeviceInfo[]
  /** A callback triggered when double clicking a device card */
  onOpenDevice?: (device: DeviceInfo) => void
}

export default function DeviceList({
  devices,
  onOpenDevice,
}: DeviceSectionProps) {
  // handle showing as list view or as grid view
  function handleDeviceSelected(device: DeviceInfo) {
    onOpenDevice?.(device)
  }

  return (
    <section className="flex flex-col gap-3">
      <h1 className="q-font-heading-xs-subtle">Devices</h1>
      <div className="flex flex-wrap gap-2.5">
        {devices?.map((item: DeviceInfo) => {
          return (
            <ArcProjectCard
              key={item.id}
              description={item.description}
              isActive={false}
              onDoubleClick={() => handleDeviceSelected(item)}
              title={item.name}
            />
          )
        })}
      </div>
    </section>
  )
}
