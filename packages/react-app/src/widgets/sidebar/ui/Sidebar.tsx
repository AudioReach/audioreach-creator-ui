import {QCard, QCardContent} from "@qui/react"

import {ModuleList} from "~features/examples/module-list"

export const Sidebar: React.FC = () => {
  return (
    <QCard className="h-[calc(100vh-400px)] w-[20%] max-w-[300px]">
      <QCardContent className="overflow-auto">
        <ModuleList />
      </QCardContent>
    </QCard>
  )
}
