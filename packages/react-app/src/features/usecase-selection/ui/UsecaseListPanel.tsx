import {
  ChevronDown,
  ChevronRight,
  PanelTopClose,
  PanelTopOpen,
  Settings,
  Trash2,
} from "lucide-react"

import {Button, IconButton} from "@qualcomm-ui/react/button"
import {Checkbox} from "@qualcomm-ui/react/checkbox"

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
      <div
        className="flex-shrink-0 px-3 py-2"
        style={{borderBottom: "1px solid var(--color-border-neutral-02)"}}
      >
        <div className="flex items-center justify-between">
          <label
            className="flex cursor-pointer items-center text-sm"
            style={{color: "var(--color-text-neutral-primary)"}}
          >
            <Checkbox
              aria-label="Select all usecases"
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
          <div className="flex items-center space-x-1">
            <IconButton
              aria-label="Expand All"
              emphasis="neutral"
              icon={PanelTopOpen}
              size="md"
              title="Expand All"
              variant="ghost"
            />
            <IconButton
              aria-label="Collapse All"
              emphasis="neutral"
              icon={PanelTopClose}
              size="md"
              title="Collapse All"
              variant="ghost"
            />
            <IconButton
              aria-label="Delete"
              emphasis="danger"
              icon={Trash2}
              size="md"
              title="Delete"
              variant="ghost"
            />
            <IconButton
              aria-label="Settings"
              emphasis="neutral"
              icon={Settings}
              size="md"
              title="Settings"
              variant="ghost"
            />
            <Button onClick={onClose} size="sm" variant="outline">
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Usecase Categories - Scrollable content */}
      <div className="flex-grow overflow-y-auto px-3 py-2">
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
            <div key={category.name} className="mb-3 last:mb-0">
              <div className="mb-1 flex items-center">
                <IconButton
                  aria-label={`${isCategoryExpanded ? "Collapse" : "Expand"} ${category.name}`}
                  emphasis="neutral"
                  icon={icon}
                  onClick={() => toggleCategoryExpansion(category.name)}
                  size="sm"
                  variant="ghost"
                />
                <label
                  className="flex cursor-pointer items-center text-sm font-semibold"
                  style={{color: "var(--color-text-neutral-primary)"}}
                >
                  <Checkbox
                    aria-label={`Select all usecases in ${category.name}`}
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
                <div
                  className="ml-6 pl-3"
                  style={{
                    borderLeft: "1px solid var(--color-border-neutral-02)",
                  }}
                >
                  {category.usecases.map(
                    (usecase: Usecase, usecaseIndex: number) => {
                      const formattedUsecase = formatUsecaseDisplay(usecase)
                      return (
                        <div key={usecaseIndex} className="mb-2 last:mb-0">
                          <label
                            className="flex cursor-pointer items-center text-sm"
                            style={{color: "var(--color-text-neutral-primary)"}}
                          >
                            <Checkbox
                              aria-label={`Select ${formattedUsecase}`}
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
                          <div
                            className="ml-6 mt-0.5 space-y-0.5 text-xs"
                            style={{
                              color: "var(--color-text-neutral-secondary)",
                            }}
                          >
                            {usecase.keyValueCollection.map(
                              (kv: KeyValue, kvIndex: number) => (
                                <div key={kvIndex}>
                                  <span
                                    className="font-medium"
                                    style={{
                                      color:
                                        "var(--color-text-neutral-primary)",
                                    }}
                                  >
                                    {kv.keyInfo.keyLabel}:
                                  </span>{" "}
                                  {kv.valueInfo.valueLabel}
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
