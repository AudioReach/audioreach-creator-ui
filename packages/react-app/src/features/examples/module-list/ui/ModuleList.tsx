import {useEffect} from "react"

import {AudioLines, Loader} from "lucide-react"

import {QDivider, QList, QListItem, QProgressCircle, QStatus} from "@qui/react"

import {useSelectedModuleStore} from "~entities/examples/module"

import {useModuleListStore} from "../model/module-list-store"

export const ModuleList: React.FC = () => {
  const {error, fetchModules, isLoading, modules} = useModuleListStore()
  const {selectModule} = useSelectedModuleStore()

  useEffect(() => {
    void fetchModules()
  }, [fetchModules])

  if (isLoading) {
    return (
      <div className="grid h-[full] grid-rows-2 items-center justify-items-center">
        <QStatus
          color="informative"
          icon={Loader}
          kind="badge"
          label="Loading Module List ..."
          size="m"
        />
        <QProgressCircle size="l" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="q-font-body-md-strong m-4">
        Error: Something went wrong {error}
      </div>
    )
  }

  return (
    <div>
      <QDivider orientation="horizontal" spacingAfter={16} />
      <div className="q-font-heading-md m-4">Modules</div>
      <QDivider orientation="horizontal" spacingAfter={16} spacingBefore={16} />

      {modules.length === 0 ? (
        <div className="q-font-body-sm-strong m-4">No modules found</div>
      ) : (
        <QList className="max-h-[100vh]">
          {modules.map((module) => (
            <QListItem
              key={module.id}
              description={module.id}
              label={module.displayName}
              onClick={() => selectModule(module.id)}
              size="l"
              startIcon={AudioLines}
            />
          ))}
        </QList>
      )}
    </div>
  )
}
