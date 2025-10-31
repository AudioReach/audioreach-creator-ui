import type {FC} from "react"

import {useSubsystemBrowserStore} from "../model/subsystem-browser-store"

import SubSystemTreeView from "./SubsystemTreeView"

export const SubsystemBrowser: FC = () => {
  // _id is intentionally unused for now to satisfy lint rule
  const handleOnClick = (_id: number) => {
    // TODO: Implement actual navigation logic
  }

  const subsystemData = useSubsystemBrowserStore((state) => state.data)

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-200"
      data-testid="subsystem-browser-placeholder"
    >
      <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
        Subsystems
      </div>
      <div className="flex-1 p-3 text-sm text-gray-500">
        <h2>Subsystem Browser</h2>
        <SubSystemTreeView data={subsystemData} onClick={handleOnClick} />
      </div>
    </div>
  )
}
