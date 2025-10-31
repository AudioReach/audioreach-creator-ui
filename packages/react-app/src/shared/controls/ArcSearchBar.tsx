import {Search} from "lucide-react"

interface ArcSearchBarProps {
  /** A callback function thats triggered on every keystroke */
  onSearchChange: (value: string) => void
  searchTerm: string
}

export default function ArcSearchBar({
  onSearchChange,
  searchTerm,
}: ArcSearchBarProps) {
  return (
    <div className="rounded-xxl flex grow gap-2.5 border border-gray-300 p-1 text-gray-900 focus:border-gray-300 focus:ring-1 focus:ring-gray-300">
      <div className="pointer-events-none flex items-center">
        <Search className="h-4 w-4 text-gray-500" />
      </div>
      <input
        className="w-full border-transparent bg-transparent text-base placeholder-gray-400 focus:outline-none"
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search for a usecase..."
        type="text"
        value={searchTerm}
      />
    </div>
  )
}
