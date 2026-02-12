/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, useMemo} from "react"

import ArcCombobox, {type ArcComboboxProps} from "./arc-combobox"
import "./arc-key-vector-selector.css"

// Types for the component props - inherit from ArcCombobox and add
// key-vector specific props
export interface ArcKeyVectorSelectorProps
  extends Omit<
    ArcComboboxProps<string>,
    "onChange" | "options" | "value" | "label"
  > {
  error?: boolean | string
  fullWidth?: boolean
  hint?: string
  keyName: string // The fixed key name for this control
  label?: string
  minWidth?: string | number
  onSelectionChange?: (selectedValue: string, keyName: string) => void
  required?: boolean
  selectedValue?: string
  values: string[] // Array of possible values for this key
}

/**
 * ArcKeyVectorSelector - A generic selector control that displays a key with
 * selectable values Each control has one fixed key and multiple values to choose
 * from.
 * Uses ArcCombobox which follows QUI themes automatically.
 */
export const ArcKeyVectorSelector = forwardRef<
  HTMLDivElement,
  ArcKeyVectorSelectorProps
>(
  (
    {
      error,
      fullWidth,
      hint,
      keyName,
      label,
      minWidth,
      onSelectionChange,
      required,
      selectedValue,
      values,
      ...restProps
    },
    ref,
  ) => {
    // Show plain values in dropdown options
    const displayOptions = useMemo((): string[] => {
      return values
    }, [values])

    // Auto-select first value if selectedValue is null/undefined and values exist
    const effectiveSelectedValue = useMemo(() => {
      if (!selectedValue && values && values.length > 0) {
        return values[0]
      }
      return selectedValue
    }, [selectedValue, values])

    // Handle selection change - ArcCombobox passes the plain value
    const handleSelectionChange = (selectedValue: string | string[]) => {
      const normalizedValue = Array.isArray(selectedValue)
        ? selectedValue[0]
        : selectedValue

      if (normalizedValue && onSelectionChange) {
        // Pass the value directly since it's already plain
        onSelectionChange(normalizedValue, keyName)
      }
    }

    // Create the display label with key name prefix or use custom label
    // Convert to string since ArcCombobox expects string label
    const displayLabel = label || `${keyName} Selector`

    // Convert the controlled value to "key: value" format for display
    const displayValue = effectiveSelectedValue
      ? `${keyName} : ${effectiveSelectedValue}`
      : ""

    // Container style for width handling
    const containerStyle: React.CSSProperties = {
      minWidth: minWidth || (fullWidth ? undefined : "200px"),
      width: fullWidth ? "100%" : undefined,
    }

    return (
      <div ref={ref}>
        <ArcCombobox<string>
          {...restProps}
          error={error}
          filterable={false}
          fullWidth={fullWidth}
          hint={hint}
          label={displayLabel}
          minWidth={minWidth}
          onChange={handleSelectionChange}
          options={displayOptions}
          required={required}
          style={containerStyle}
          value={displayValue}
        />
      </div>
    )
  },
)

ArcKeyVectorSelector.displayName = "ArcKeyVectorSelector"

export default ArcKeyVectorSelector
