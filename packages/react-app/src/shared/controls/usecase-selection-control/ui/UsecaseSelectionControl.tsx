import {useEffect, useRef, useState} from "react"

import {QTextInput} from "@qui/react"

import type {KeyValue, Usecase, UsecaseCategory} from "./types"
import UsecaseListPanel from "./UsecaseListPanel"

// Utility to format a Usecase's keyValueCollection into a display string
const formatUsecaseDisplay = (usecase: Usecase): string => {
  return usecase._keyValueCollection
    .map((kv: KeyValue) => kv._valueLabel)
    .join(" • ")
}

interface UsecaseNavigationControlProps {
  usecaseData: UsecaseCategory[]
}

const UsecaseNavigationControl: React.FC<UsecaseNavigationControlProps> = ({
  usecaseData,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedUsecases, setSelectedUsecases] = useState<string[]>([]) // Stores formatted usecase strings
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    usecaseData.filter((cat) => cat.expanded).map((cat) => cat.name),
  )

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName],
    )
  }

  const dropdownRef = useRef<HTMLDivElement>(null) // Ref for the entire dropdown area including input

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the dropdown container
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleSelectUsecase = (
    formattedUsecase: string,
    isSelected: boolean,
  ) => {
    if (isSelected) {
      setSelectedUsecases((prev) => [...prev, formattedUsecase])
    } else {
      setSelectedUsecases((prev) =>
        prev.filter((uc) => uc !== formattedUsecase),
      )
    }
  }

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allUsecaseStrings = usecaseData.flatMap((category) =>
        category.usecases.map((uc: Usecase) => formatUsecaseDisplay(uc)),
      )
      setSelectedUsecases(allUsecaseStrings)
    } else {
      setSelectedUsecases([])
    }
  }

  // Utility to determine if a usecase is checked based on its current display
  // format. This needs to be consistent with how selectedUsecases are stored.
  const isUsecaseChecked = (usecase: Usecase) => {
    return selectedUsecases.includes(formatUsecaseDisplay(usecase))
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search Bar */}
      <div className="relative">
        <QTextInput
          clearable
          fullWidth
          inputProps={{
            onFocus: () => setIsDropdownOpen(true),
          }}
          onChange={(e, value) => setSearchTerm(value)}
          onClear={() => setSearchTerm("")}
          placeholder="Search for usecases..."
          size="m"
          value={searchTerm}
        />
      </div>

      {/* Dropdown Content */}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 flex max-h-96 rounded-md border border-gray-300 bg-white shadow-lg">
          <UsecaseListPanel
            expandedCategories={expandedCategories}
            formatUsecaseDisplay={formatUsecaseDisplay}
            handleSelectAll={handleSelectAll}
            handleSelectUsecase={handleSelectUsecase}
            isUsecaseChecked={isUsecaseChecked}
            selectedUsecases={selectedUsecases}
            toggleCategoryExpansion={toggleCategoryExpansion}
            usecaseData={usecaseData}
          />
        </div>
      )}
    </div>
  )
}

export default UsecaseNavigationControl
