import {QCombobox} from "@qui/react"

/**
 * ARCCombobox - A simple wrapper around QCombobox that leverages its
 * object support and provides consistent styling
 */
export interface ARCComboboxProps<T = string>
  extends Omit<React.ComponentProps<typeof QCombobox>, "onChange"> {
  error?: boolean | string
  fullWidth?: boolean
  hint?: string
  minWidth?: string | number
  onChange?: (value: T | T[]) => void
  ref?: React.Ref<HTMLDivElement>
  required?: boolean
  width?: string | number
}

export const ARCCombobox = <T = string,>(props: ARCComboboxProps<T>) => {
  const {
    error,
    fullWidth,
    hint,
    minWidth,
    onChange,
    ref,
    required,
    style,
    width,
    ...restProps
  } = props

  const handleChange: React.ComponentProps<typeof QCombobox>["onChange"] = (
    event,
    value,
  ) => {
    if (onChange) {
      // Always call onChange, even for null/undefined values (when clearing)
      onChange(value as T | T[])
    }
  }

  // Combine width prop with existing style
  const containerStyle: React.CSSProperties = {
    minWidth: minWidth || width || (fullWidth ? undefined : "200px"), // Default minimum width
    width: width || (fullWidth ? "100%" : undefined),
    ...style,
  }

  // Prepare QCombobox props - pass through all props except our custom ones
  const finalQComboboxProps = {
    ...restProps,
    error: typeof error === "boolean" ? error : !!error,
    onChange: handleChange,
    style: {
      minWidth: minWidth || width || (fullWidth ? undefined : "200px"),
      width: width || (fullWidth ? "100%" : undefined),
    },
  } as unknown as React.ComponentProps<typeof QCombobox>

  return (
    <div
      ref={ref}
      className="arc-combobox-container"
      data-testid="arc-combobox"
      style={containerStyle}
    >
      <QCombobox {...finalQComboboxProps} />
      {hint && !error && (
        <div className="arc-combobox-hint" data-testid="combobox-hint">
          {hint}
        </div>
      )}
      {typeof error === "string" && (
        <div className="arc-combobox-error" data-testid="combobox-error">
          {error}
        </div>
      )}
      {required && (
        <div className="arc-combobox-required" data-testid="combobox-required">
          * Required
        </div>
      )}
    </div>
  )
}

ARCCombobox.displayName = "ARCCombobox"

export default ARCCombobox
