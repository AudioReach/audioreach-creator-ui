/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC} from "react"

import {Search} from "lucide-react"

import {TextInput} from "@qualcomm-ui/react/text-input"

interface SearchProps {
  onChange: (value: string) => void
  onClear: () => void
  searchTerm: string
}

const SearchBox: FC<SearchProps> = ({onChange, onClear, searchTerm}) => {
  const handleValueChange = (value: string) => {
    onChange(value)
    // If value is empty, also call onClear
    if (!value) {
      onClear()
    }
  }

  return (
    <div style={{alignItems: "center", display: "flex"}}>
      <TextInput
        aria-label="Search subsystems"
        clearable
        onValueChange={handleValueChange}
        placeholder="Search..."
        size="sm"
        startIcon={Search}
        value={searchTerm}
      />
    </div>
  )
}

export default SearchBox
