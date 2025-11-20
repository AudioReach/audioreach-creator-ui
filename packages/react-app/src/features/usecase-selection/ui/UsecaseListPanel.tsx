import {
  ChevronDown,
  ChevronRight,
  PanelTopClose,
  PanelTopOpen,
  Settings,
  Trash2,
} from "lucide-react"

import {QCheckbox, QIconButton} from "@qui/react"

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
    <div className="flex w-2/3 flex-col">
      {/* Top controls - Sticky header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center text-sm text-gray-700">
            <QCheckbox
              checked={
                selectedUsecases.length ===
                  usecaseData.flatMap((cat) => cat.usecases).length &&
                usecaseData.flatMap((cat) => cat.usecases).length > 0
              }
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span className="ml-2">Select All</span>
          </label>
          <div className="flex items-center space-x-2">
            <QIconButton
              color="neutral"
              size="s"
              title="Expand All"
              variant="ghost"
            >
              <PanelTopOpen className="h-5 w-5" />
            </QIconButton>
            <QIconButton
              color="neutral"
              size="s"
              title="Collapse All"
              variant="ghost"
            >
              <PanelTopClose className="h-5 w-5" />
            </QIconButton>
            <QIconButton
              color="neutral"
              size="s"
              title="Delete"
              variant="ghost"
            >
              <Trash2 className="h-5 w-5" />
            </QIconButton>
            <QIconButton
              color="neutral"
              size="s"
              title="Settings"
              variant="ghost"
            >
              <Settings className="h-5 w-5" />
            </QIconButton>
            <button
              className="ml-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
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

          return (
            <div key={category.name} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center">
                <QIconButton
                  color="neutral"
                  onClick={() => toggleCategoryExpansion(category.name)}
                  size="s"
                  variant="ghost"
                >
                  {isCategoryExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </QIconButton>
                <label className="flex cursor-pointer items-center text-sm font-semibold text-gray-800">
                  <QCheckbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={(e) => {
                      category.usecases.forEach((uc: Usecase) =>
                        handleSelectUsecase(
                          formatUsecaseDisplay(uc),
                          e.target.checked,
                        ),
                      )
                    }}
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
                          <label className="flex cursor-pointer items-center text-sm text-gray-700">
                            <QCheckbox
                              checked={selectedUsecases.includes(
                                formattedUsecase,
                              )}
                              onChange={(e) =>
                                handleSelectUsecase(
                                  formattedUsecase,
                                  e.target.checked,
                                )
                              }
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
