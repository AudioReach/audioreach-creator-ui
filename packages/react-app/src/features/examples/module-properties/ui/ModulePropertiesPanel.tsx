import {useEffect} from "react"

import {AlertCircle, Loader, Settings} from "lucide-react"

import {
  QCard,
  QCardTitle,
  QDivider,
  QProgressCircle,
  QStatus,
  QTextArea,
  QTextInput,
} from "@qui/react"

import {useSelectedModuleStore} from "~entities/examples/module"

import {useModulePropertiesStore} from "../model/module-properties-store"

export const ModulePropertiesPanel: React.FC = () => {
  const {selectedModuleId} = useSelectedModuleStore()
  const {getProperties, isLoading, loadProperties} = useModulePropertiesStore()

  const properties = selectedModuleId ? getProperties(selectedModuleId) : null
  const loading = selectedModuleId ? isLoading(selectedModuleId) : false

  useEffect(() => {
    if (selectedModuleId && !properties && !loading) {
      void loadProperties(selectedModuleId)
    }
  }, [selectedModuleId, properties, loading, loadProperties])

  // Early return if no module is selected
  if (!selectedModuleId) {
    return (
      <QCard className="w-full">
        <div className="p-4">
          <div className="text-center text-gray-500">No module selected</div>
        </div>
      </QCard>
    )
  }

  if (loading) {
    return (
      <QCard className="w-full">
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4">
            <QProgressCircle size="m" />
            <QStatus
              color="informative"
              icon={Loader}
              kind="badge"
              label="Loading module properties..."
              size="m"
            />
          </div>
        </div>
      </QCard>
    )
  }

  if (!properties) {
    return (
      <QCard className="w-full">
        <div className="p-4">
          <QStatus
            color="red"
            icon={AlertCircle}
            kind="badge"
            label="Failed to load module properties"
            size="m"
          />
        </div>
      </QCard>
    )
  }

  return (
    <QCard className="w-full">
      <div className="p-4">
        <QCardTitle className="mb-4 flex items-center gap-2">
          <Settings size={20} />
          Module Properties
        </QCardTitle>

        <QDivider orientation="horizontal" spacingAfter={16} />

        <div className="space-y-4">
          <div>
            <label className="q-font-body-sm-strong mb-2 block">
              Display Name
            </label>
            <QTextInput
              className="w-full rounded px-3 py-2"
              placeholder="Enter display name"
              value={properties.displayName || ""}
            />
          </div>

          <div>
            <label className="q-font-body-sm-strong mb-2 block">
              Module ID
            </label>
            <QTextInput
              className="w-full rounded px-3 py-2"
              disabled
              value={properties.moduleId}
            />
          </div>

          <div>
            <label className="q-font-body-sm-strong mb-2 block">Name</label>
            <QTextInput
              className="w-full rounded px-3 py-2"
              disabled
              value={properties.name || ""}
            />
          </div>

          <div>
            <label className="q-font-body-sm-strong mb-2 block">
              Description
            </label>
            <QTextArea
              className="flex w-full overflow-auto rounded px-3 py-2"
              disabled
              inputProps={{cols: 50, rows: 10}}
              placeholder="Enter description"
              size="m"
              value={properties.description || ""}
            />
          </div>

          <div>
            <label className="q-font-body-sm-strong mb-2 block">Type</label>
            <input
              className="w-full rounded px-3 py-2"
              disabled
              type="text"
              value={properties.isBuiltin ? "Built-in" : "Custom"}
            />
          </div>

          <QDivider
            orientation="horizontal"
            spacingAfter={16}
            spacingBefore={16}
          />

          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              type="button"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </QCard>
  )
}
