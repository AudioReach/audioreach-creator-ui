import ArcProjectCard from "~shared/controls/ArcProjectCard"
import type ArcDeviceInfo from "~shared/types/arc-device-info"

interface ArcDeviceSectionProps {
  /** List of devices to display in the device list */
  devices?: ArcDeviceInfo[]
  /** A callback triggered when double clicking a device card */
  onOpenDevice?: (device: ArcDeviceInfo) => void
}

export default function ArcDeviceList({
  devices,
  onOpenDevice,
}: ArcDeviceSectionProps) {
  // handle showing as list view or as grid view
  function handleDeviceSelected(device: ArcDeviceInfo) {
    console.log(device)
    onOpenDevice?.(device)
  }

  return (
    <section className="flex flex-col gap-3">
      <h1 className="q-font-heading-xs-subtle">Devices</h1>
      <div className="flex flex-wrap gap-2.5">
        {devices?.map((item: ArcDeviceInfo) => {
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
