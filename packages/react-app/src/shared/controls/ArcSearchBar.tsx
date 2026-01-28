import {Search} from "lucide-react"

import {TextInput} from "@qualcomm-ui/react/text-input"

interface ArcSearchBarProps {
  /** A callback function thats triggered on every keystroke */
  onSearchChange: (value: string) => void
  placeholder?: string
  searchTerm: string
}

export default function ArcSearchBar({
  onSearchChange,
  placeholder,
  searchTerm,
}: ArcSearchBarProps) {
  return (
    <TextInput
      aria-label={placeholder || "Search"}
      className="w-full border-transparent bg-transparent text-base placeholder-gray-400 focus:outline-none"
      onValueChange={onSearchChange}
      placeholder={placeholder}
      startIcon={Search}
      value={searchTerm}
    />
  )
}
