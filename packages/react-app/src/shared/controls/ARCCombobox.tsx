import {useMemo} from "react"

import {Combobox} from "@qualcomm-ui/react/combobox"
import {useListCollection} from "@qualcomm-ui/react-core/collection"

/**
 * ARCCombobox - A wrapper around the new Combobox from qualcomm-ui
 * Maintains backward compatibility with the old QCombobox API
 */
export interface ARCComboboxProps<T = string> {
  /** Custom CSS class name */
  className?: string
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Error state - boolean or error message string */
  error?: boolean | string
  /** Enable filtering/search functionality */
  filterable?: boolean
  /** Make the combobox take full width of container */
  fullWidth?: boolean
  /** Helper text displayed below the input */
  hint?: string
  /** Unique identifier */
  id?: string
  /** Label text for the combobox */
  label?: string
  /** Minimum width of the combobox */
  minWidth?: string | number
  /** Enable multiple selection */
  multiple?: boolean
  /** Change handler - called when selection changes */
  onChange?: (value: T | T[]) => void
  /** Array of options to display */
  options?: T[]
  /** Placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Custom inline styles */
  style?: React.CSSProperties
  /** Current selected value(s) */
  value?: T | T[]
  /** Width of the combobox */
  width?: string | number
}

export const ARCCombobox = <T extends string = string>(
  props: ARCComboboxProps<T>,
) => {
  const {
    className,
    disabled = false,
    error,
    filterable = false,
    fullWidth = false,
    hint,
    id,
    label,
    minWidth,
    multiple = false,
    onChange,
    options = [],
    placeholder,
    required = false,
    style,
    value,
    width,
  } = props

  // Create collection from options array using the hook
  const {collection} = useListCollection({
    initialItems: options.map((option) => ({
      label: String(option),
      value: String(option),
    })),
  })

  // Handle value change
  const handleValueChange = (details: {value: string[]}) => {
    if (onChange) {
      if (multiple) {
        // For multiple selection, return array
        onChange(details.value as T | T[])
      } else {
        // For single selection, return single value or empty string
        onChange((details.value[0] || "") as T | T[])
      }
    }
  }

  // Normalize value to array format for the Combobox
  const normalizedValue = useMemo(() => {
    if (!value) {
      return []
    }
    return Array.isArray(value) ? value.map(String) : [String(value)]
  }, [value])

  // Determine error state
  const isInvalid = typeof error === "boolean" ? error : !!error
  const errorMessage = typeof error === "string" ? error : undefined

  // Container styles
  const containerStyle: React.CSSProperties = {
    minWidth: minWidth || width || (fullWidth ? undefined : "200px"),
    width: width || (fullWidth ? "100%" : undefined),
    ...style,
  }

  return (
    <div
      className={`arc-combobox-container ${className || ""}`}
      data-testid="arc-combobox"
      style={containerStyle}
    >
      <Combobox.Root
        collection={collection}
        disabled={disabled}
        id={id}
        inputBehavior={filterable ? "autocomplete" : "none"}
        invalid={isInvalid}
        multiple={multiple}
        onValueChange={handleValueChange}
        positioning={{sameWidth: true}}
        value={normalizedValue}
      >
        {label && <Combobox.Label>{label}</Combobox.Label>}

        <Combobox.Control>
          <Combobox.Input placeholder={placeholder} />
          <Combobox.Trigger />
        </Combobox.Control>

        {hint && !isInvalid && (
          <Combobox.Hint data-testid="combobox-hint">{hint}</Combobox.Hint>
        )}

        {isInvalid && errorMessage && (
          <Combobox.ErrorText data-testid="combobox-error">
            {errorMessage}
          </Combobox.ErrorText>
        )}

        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.Items />
          </Combobox.Content>
        </Combobox.Positioner>
      </Combobox.Root>

      {required && !label && (
        <div className="arc-combobox-required" data-testid="combobox-required">
          * Required
        </div>
      )}
    </div>
  )
}

ARCCombobox.displayName = "ARCCombobox"

export default ARCCombobox
