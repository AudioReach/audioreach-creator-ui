import type {FC} from "react"

import {Search} from "lucide-react"

import {QTextInput} from "@qui/react"

interface SearchProps {
  onChange: (value: string) => void
  onClear: () => void
  searchTerm: string
}

const SearchBox: FC<SearchProps> = ({onChange, onClear, searchTerm}) => (
  <div style={{alignItems: "center", display: "flex"}}>
    <QTextInput
      fullWidth
      onChange={(_event, value, _reason) => onChange(value)}
      onClear={() => onClear()}
      placeholder="Search..."
      size="s"
      startIcon={Search}
      value={searchTerm}
    />
  </div>
)

export default SearchBox
