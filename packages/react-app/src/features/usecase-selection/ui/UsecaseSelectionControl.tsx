import {useEffect, useRef, useState} from "react"

import {TextInput} from "@qualcomm-ui/react/text-input"
import {Search} from "lucide-react"

import {useUsecaseStore} from "~shared/store/usecase-store"

const EMPTY_SELECTED_USECASES: string[] = []

import type {KeyValue, Usecase, UsecaseCategory} from "../model/types"

import UsecaseListPanel from "./UsecaseListPanel"

// Utility to format a Usecase's keyValueCollection into a display string
const formatUsecaseDisplay = (usecase: Usecase): string => {
  return usecase.keyValueCollection
    .map((kv: KeyValue) => kv.valueLabel)
    .join(" • ")
}

interface UsecaseNavigationControlProps {
  projectGroupId: string
  usecaseData: UsecaseCategory[]
}

const UsecaseNavigationControl: React.FC<UsecaseNavigationControlProps> = ({
  projectGroupId,
  usecaseData,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    usecaseData.filter((cat) => cat.expanded).map((cat) => cat.name),
  )

  // Get selected usecases from store - ensure stable reference when empty
  const selectedUsecases = useUsecaseStore(
    (state) =>
      state.selectedUsecases[projectGroupId] ?? EMPTY_SELECTED_USECASES,
  )

  // Get store method - this is stable and won't cause re-renders
  const setSelectedUsecases = useUsecaseStore(
    (state) => state.setSelectedUsecases,
  )

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName],
    )
  }

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDropdownOpen) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      // Use capture phase to catch events before they're stopped by child components
      document.addEventListener("mousedown", handleClickOutside, true)
      document.addEventListener("keydown", handleEscapeKey)
    } else {
      document.removeEventListener("mousedown", handleClickOutside, true)
      document.removeEventListener("keydown", handleEscapeKey)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true)
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isDropdownOpen])

  const handleSelectUsecase = (
    formattedUsecase: string,
    isSelected: boolean,
  ) => {
    if (isSelected) {
      setSelectedUsecases(projectGroupId, [
        ...selectedUsecases,
        formattedUsecase,
      ])
    } else {
      setSelectedUsecases(
        projectGroupId,
        selectedUsecases.filter((uc) => uc !== formattedUsecase),
      )
    }
  }

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allUsecaseStrings = usecaseData.flatMap((category) =>
        category.usecases.map((uc: Usecase) => formatUsecaseDisplay(uc)),
      )
      setSelectedUsecases(projectGroupId, allUsecaseStrings)
    } else {
      setSelectedUsecases(projectGroupId, [])
    }
  }

  // Utility to determine if a usecase is checked based on its current display
  // format. This needs to be consistent with how selectedUsecases are stored.
  const isUsecaseChecked = (usecase: Usecase) => {
    return selectedUsecases.includes(formatUsecaseDisplay(usecase))
  }

  // Filter usecases based on search term
  const filteredUsecaseData = usecaseData
    .map((category) => ({
      ...category,
      usecases: category.usecases.filter((usecase: Usecase) => {
        if (!searchTerm) {
          return true
        }
        const formattedUsecase = formatUsecaseDisplay(usecase).toLowerCase()
        const searchLower = searchTerm.toLowerCase()
        return (
          formattedUsecase.includes(searchLower) ||
          usecase.keyValueCollection.some(
            (kv: KeyValue) =>
              kv.keyLabel.toLowerCase().includes(searchLower) ||
              kv.valueLabel.toLowerCase().includes(searchLower),
          )
        )
      }),
    }))
    .filter((category) => category.usecases.length > 0)

  return (
    <div ref={containerRef} className="relative">
      {/* Search Bar */}
      <div className="relative">
        <TextInput
          clearable
          inputProps={{
            onFocus: () => setIsDropdownOpen(true),
          }}
          onValueChange={(value) => setSearchTerm(value)}
          placeholder="Search for usecases..."
          size="md"
          startIcon={Search}
          value={searchTerm}
        />
      </div>

      {/* Dropdown Content */}
      {isDropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full z-10 mt-1 flex max-h-96 rounded-md shadow-lg"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            border: "1px solid var(--color-border-neutral-02)",
          }}
        >
          <UsecaseListPanel
            expandedCategories={expandedCategories}
            formatUsecaseDisplay={formatUsecaseDisplay}
            handleSelectAll={handleSelectAll}
            handleSelectUsecase={handleSelectUsecase}
            isUsecaseChecked={isUsecaseChecked}
            onClose={() => setIsDropdownOpen(false)}
            selectedUsecases={selectedUsecases}
            toggleCategoryExpansion={toggleCategoryExpansion}
            usecaseData={filteredUsecaseData}
          />
        </div>
      )}
    </div>
  )
}

export default UsecaseNavigationControl
