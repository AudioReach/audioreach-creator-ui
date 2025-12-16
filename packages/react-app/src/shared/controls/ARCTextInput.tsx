import {type ChangeEvent, Component, type KeyboardEvent} from "react"

import {TextInput, type TextInputProps} from "@qualcomm-ui/react/text-input"

/**
 * Props interface for ARCTextInput component
 * Extends QTextInputProps but overrides onChange for enhanced functionality
 */
export interface ARCTextInputProps extends Omit<TextInputProps, "onChange"> {
  // Enhanced numeric features
  /** Allow hexadecimal input (e.g., "0xFF" or "FF") for numeric types */
  acceptHex?: boolean
  /** Number of decimal places allowed for numeric inputs (0 = integers only) */
  decimalPrecision?: number

  // HTML input attributes that QTextInput might not have
  /** Maximum numeric value (for number inputs) */
  max?: number
  /** Minimum numeric value (for number inputs) */
  min?: number

  // Custom event signatures (override QTextInput's onChange)
  /** Enhanced onChange handler that provides both value and event */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void
  /** Key press event handler */
  onKeyPress?: (event: KeyboardEvent<HTMLInputElement>) => void
  /** Whether the field is required for validation */
  required?: boolean
  /** Input type - determines validation and formatting behavior */
  type?: "text" | "number"
}

/**
 * Internal state interface for ARCTextInput component
 */
interface ARCTextInputState {
  /** Current validation error message, if any */
  validationError?: string
}

/**
 * ARCTextInput - Enhanced class-based wrapper around QTextInput with validation
 * Extends React.Component to provide class-based inheritance
 */
export class ARCTextInput extends Component<
  ARCTextInputProps,
  ARCTextInputState
> {
  static displayName = "ARCTextInput"

  constructor(props: ARCTextInputProps) {
    super(props)
    this.state = {
      validationError: undefined,
    }
  }

  /**
   * Component lifecycle: Validate initial value when component mounts
   */
  componentDidMount() {
    this.validateCurrentValue()
  }

  /**
   * Component lifecycle: Re-validate when value prop changes
   */
  componentDidUpdate(prevProps: ARCTextInputProps) {
    if (prevProps.value !== this.props.value) {
      this.validateCurrentValue()
    }
  }

  /**
   * Determines the actual HTML input type to use
   * For numeric inputs with special features (hex, decimal precision),
   * we use "text" type to have full control over input validation
   */
  private getInputType = (): string => {
    const {acceptHex, decimalPrecision, type = "text"} = this.props
    const isNumeric = type === "number"
    return isNumeric && (acceptHex || typeof decimalPrecision === "number")
      ? "text"
      : type
  }

  /**
   * Calculates the step value for HTML number inputs
   * For precision 0: step="1" (integers only)
   * For precision 2: step="0.01" (hundredths)
   * For precision 3: step="0.001" (thousandths), etc.
   */
  private getStepValue = (): string | undefined => {
    const {decimalPrecision} = this.props
    const inputType = this.getInputType()

    if (
      inputType === "number" &&
      typeof decimalPrecision === "number" &&
      decimalPrecision >= 0
    ) {
      return decimalPrecision === 0
        ? "1"
        : `0.${"0".repeat(decimalPrecision - 1)}1`
    }
    return undefined
  }

  /**
   * Enhanced change handler that validates input and provides error feedback
   */
  private handleChange = (
    newValue: string,
    event?: ChangeEvent<HTMLInputElement>,
  ) => {
    // Validate the new value and update error state
    const validationError = this.validateValue(newValue)
    this.setState({validationError})

    // Call the user's onChange callback if provided
    if (this.props.onChange && event) {
      this.props.onChange(newValue, event)
    }
  }

  /**
   * Handles keydown events for onKeyPress prop support
   */
  private handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const {onKeyPress} = this.props

    if (onKeyPress) {
      onKeyPress(event)
    }
  }

  /**
   * Helper function to convert hexadecimal string to decimal number
   * Handles both "0x" prefixed and plain hex strings
   */
  private hexToDecimal = (hexVal: string): number => {
    const cleanVal = hexVal.toLowerCase().replace(/^0x/, "")
    return parseInt(cleanVal, 16)
  }

  /**
   * Helper function to validate if a string is a valid hexadecimal number
   * Returns true if the string contains only valid hex characters (0-9, a-f)
   */
  private isValidHex = (val: string): boolean => {
    if (!val) {
      return false
    }
    const cleanVal = val.toLowerCase().replace(/^0x/, "")
    return /^[0-9a-f]+$/.test(cleanVal)
  }

  /**
   * Renders the ARCTextInput component
   * Extracts props, configures input behavior, and renders the underlying
   * QTextInput
   */
  render() {
    const {
      // Extract native props
      autoFocus,
      className,
      clearable,
      defaultValue,
      disabled,
      errorText,
      hint,
      id,
      label,
      max,
      min,
      name,
      onBlur,
      onFocus,
      placeholder,
      readOnly,
      size,
      style,
      value,
    } = this.props

    const {validationError} = this.state

    // Determine final error message (manual error prop takes precedence)
    const finalError = errorText || validationError

    const inputType = this.getInputType()
    const stepValue = this.getStepValue()

    // Input props for QTextInput - configure the underlying HTML input element
    const inputProps = {
      max: inputType === "number" ? max : undefined,
      min: inputType === "number" ? min : undefined,
      onKeyDown: this.handleKeyDown,
      step: stepValue,
      type: inputType,
    }

    return (
      <TextInput
        autoFocus={autoFocus}
        className={className}
        clearable={clearable}
        defaultValue={defaultValue ? String(defaultValue) : undefined}
        disabled={disabled}
        errorText={finalError}
        hint={hint}
        id={id}
        inputProps={inputProps}
        invalid={!!finalError}
        label={label}
        name={name}
        onBlur={onBlur}
        onFocus={onFocus}
        onValueChange={this.handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        size={size}
        style={style}
        value={value ? String(value) : undefined}
      />
    )
  }

  /**
   * Helper function to determine if a value should be treated as hexadecimal
   * Only treats as hex if it starts with "0x" or contains hex letters (a-f)
   * Pure numeric values (like "123") are treated as decimal numbers
   */
  private shouldTreatAsHex = (val: string): boolean => {
    if (!val) {
      return false
    }

    const lowerVal = val.toLowerCase()

    // If it starts with 0x, definitely treat as hex
    if (lowerVal.startsWith("0x")) {
      return true
    }

    // If it contains hex letters (a-f), treat as hex
    if (/[a-f]/i.test(val)) {
      return true
    }

    // If it's purely numeric (like "123"), treat as decimal
    if (/^\d+$/.test(val)) {
      return false
    }

    // For other cases with mixed characters, treat as hex if it could be valid hex
    return /^[0-9a-f]+$/i.test(val)
  }

  /**
   * Validates the current value and updates the component state
   * Called internally when the component mounts or value changes
   */
  private validateCurrentValue = () => {
    const validationError = this.validateValue(String(this.props.value || ""))
    this.setState({validationError})
  }

  /**
   * Enhanced validation logic for all input types with improved error messages
   * Handles required field validation, numeric validation (including hex),
   * decimal precision validation, min/max constraints, and length constraints
   */
  private validateValue = (val: string): string | undefined => {
    const {
      acceptHex,
      decimalPrecision,
      max,
      min,
      required,
      type = "text",
    } = this.props

    // Check required field validation
    if (!val && required) {
      return "This field is required"
    }

    const isNumeric = type === "number"
    if (val && isNumeric) {
      let numValue: number
      let isHex = false

      // Check if acceptHex is enabled
      if (acceptHex) {
        // First, try to determine if this looks like it should be hex
        const looksLikeHex = this.shouldTreatAsHex(val)

        if (looksLikeHex) {
          // User is trying to enter hex, validate it
          if (this.isValidHex(val)) {
            numValue = this.hexToDecimal(val)
            isHex = true
          } else {
            return "Please enter a valid hexadecimal number"
          }
        } else {
          // Try parsing as decimal first
          numValue = parseFloat(val)
          if (isNaN(numValue)) {
            // If it's not a valid decimal and acceptHex is true,
            // check if it might be an invalid hex attempt
            if (/[a-z]/i.test(val)) {
              return "Please enter a valid number or hexadecimal value"
            }
            return "Please enter a valid number or hexadecimal value"
          }

          // Check if the entire string is a valid decimal number
          // parseFloat is too lenient and parses partial numbers like "45gghgg" ->
          // 45
          if (!/^\d*\.?\d+$/.test(val)) {
            return "Please enter a valid number or hexadecimal value"
          }
        }
      } else {
        // Parse as regular decimal number only
        numValue = parseFloat(val)
        if (isNaN(numValue)) {
          return "Please enter a valid number"
        }

        // Check if the entire string is a valid decimal number
        // parseFloat is too lenient and parses partial numbers like "45gghgg" -> 45
        if (!/^\d*\.?\d+$/.test(val)) {
          return "Please enter a valid number"
        }
      }

      // Check decimal precision constraints for non-hex values
      if (!isHex && typeof decimalPrecision === "number") {
        if (decimalPrecision === 0) {
          // For precision 0, check if there are any decimal points
          if (val.includes(".")) {
            return "Decimal points are not allowed for this field"
          }
          // Check if it's a whole number
          if (numValue !== Math.floor(numValue)) {
            return "Please enter a whole number"
          }
        } else {
          // For other precisions, check decimal places
          const decimalPart = val.split(".")[1]
          if (decimalPart && decimalPart.length > decimalPrecision) {
            return `Maximum ${decimalPrecision} decimal place${decimalPrecision === 1 ? "" : "s"} allowed`
          }
        }
      }

      // Validate numeric range constraints
      if (typeof min === "number" && numValue < min) {
        return `Value must be at least ${min}${isHex ? ` (0x${min.toString(16).toUpperCase()})` : ""}`
      }

      if (typeof max === "number" && numValue > max) {
        return `Value must be at most ${max}${isHex ? ` (0x${max.toString(16).toUpperCase()})` : ""}`
      }
    }

    return undefined
  }
}

export default ARCTextInput
