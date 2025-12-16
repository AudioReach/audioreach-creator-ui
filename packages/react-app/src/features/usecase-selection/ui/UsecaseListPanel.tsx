import {Button, IconButton} from "@qualcomm-ui/react/button"
import {Checkbox} from "@qualcomm-ui/react/checkbox"
import {
  ChevronDown,
  ChevronRight,
  PanelTopClose,
  PanelTopOpen,
  Settings,
  Trash2,
} from "lucide-react"

import type {KeyValue, Usecase, UsecaseCategory} from "../model/types"

interface UsecaseListPanelProps {
  expandedCategories: string[]
  formatUsecaseDisplay: (usecase: Usecase) => string
  handleSelectAll: (isSelected: boolean) => void
  handleSelectUsecase: (formattedUsecase: string, isSelected: boolean) => void
  isUsecaseChecked: (usecase: Usecase) => boolean
  onClose: () => void
  selectedUsecases: string[]
  toggleCategoryExpansion: (categoryName: string) => void
  usecaseData: UsecaseCategory[]
}

const UsecaseListPanel: React.FC<UsecaseListPanelProps> = ({
  expandedCategories,
  formatUsecaseDisplay,
  handleSelectAll,
  handleSelectUsecase,
  isUsecaseChecked,
  onClose,
  selectedUsecases,
  toggleCategoryExpansion,
  usecaseData,
}) => {
  return (
    <div className="flex w-full flex-col">
      {/* Top controls - Sticky header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <label className="text-md flex cursor-pointer items-center text-gray-700">
            <Checkbox
              checked={
                selectedUsecases.length ===
                  usecaseData.flatMap((cat) => cat.usecases).length &&
                usecaseData.flatMap((cat) => cat.usecases).length > 0
              }
              onCheckedChange={handleSelectAll}
              size="sm"
            />
            <span className="ml-2">Select All</span>
          </label>
          <div className="flex items-center space-x-2">
            <IconButton
              emphasis="neutral"
              icon={PanelTopOpen}
              size="md"
              title="Expand All"
              variant="ghost"
            />
            <IconButton
              emphasis="neutral"
              icon={PanelTopClose}
              size="md"
              title="Collapse All"
              variant="ghost"
            />
            <IconButton
              emphasis="neutral"
              icon={Trash2}
              size="md"
              title="Delete"
              variant="ghost"
            />
            <IconButton
              emphasis="neutral"
              icon={Settings}
              size="md"
              title="Settings"
              variant="ghost"
            />
            <Button onClick={onClose} size="md" variant="outline">
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Usecase Categories - Scrollable content */}
      <div className="flex-grow overflow-y-auto p-4">
        {usecaseData.map((category) => {
          const isCategoryExpanded = expandedCategories.includes(category.name)
          const checkedUsecasesInCategory = category.usecases.filter(
            (uc: Usecase) => isUsecaseChecked(uc),
          ).length
          const totalUsecasesInCategory = category.usecases.length
          const allChecked =
            checkedUsecasesInCategory === totalUsecasesInCategory
          const someChecked =
            checkedUsecasesInCategory > 0 &&
            checkedUsecasesInCategory < totalUsecasesInCategory
          const icon = isCategoryExpanded ? ChevronDown : ChevronRight
          return (
            <div key={category.name} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center">
                <IconButton
                  emphasis="neutral"
                  icon={icon}
                  onClick={() => toggleCategoryExpansion(category.name)}
                  size="md"
                  variant="ghost"
                />
                <label className="text-md flex cursor-pointer items-center font-semibold text-gray-800">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onCheckedChange={(checked) => {
                      category.usecases.forEach((uc: Usecase) =>
                        handleSelectUsecase(formatUsecaseDisplay(uc), checked),
                      )
                    }}
                    size="sm"
                  />
                  <span className="ml-2">{category.name}</span>
                </label>
              </div>
              {isCategoryExpanded && (
                <div className="ml-8 border-l border-gray-200 pl-4">
                  {category.usecases.map(
                    (usecase: Usecase, usecaseIndex: number) => {
                      const formattedUsecase = formatUsecaseDisplay(usecase)
                      return (
                        <div key={usecaseIndex} className="mb-3 last:mb-0">
                          <label className="text-md flex cursor-pointer items-center text-gray-700">
                            <Checkbox
                              checked={selectedUsecases.includes(
                                formattedUsecase,
                              )}
                              onCheckedChange={(checked) =>
                                handleSelectUsecase(formattedUsecase, checked)
                              }
                              size="sm"
                            />
                            <span className="ml-2">{formattedUsecase}</span>
                          </label>
                          <div className="ml-6 mt-1 space-y-0.5 text-xs text-gray-500">
                            {usecase._keyValueCollection.map(
                              (kv: KeyValue, kvIndex: number) => (
                                <div key={kvIndex}>
                                  <span className="font-medium text-gray-600">
                                    {kv._keyLabel}:
                                  </span>{" "}
                                  {kv._valueLabel}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UsecaseListPanel
