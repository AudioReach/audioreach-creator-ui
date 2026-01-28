import {useEffect, useMemo, useRef, useState} from "react"

import {X} from "lucide-react"

import {Button} from "@qualcomm-ui/react/button"

import ARCCombobox from "./ARCCombobox"
import ARCTextInput from "./ARCTextInput"
import "./ARCChannelConfigDialog.css"

export interface ARCChannelConfigDialogProps {
  maxChannelCount?: number
  onClose: () => void
  onSave?: (channelConfig: {[key: number]: string}) => void
  options?: string[]
  selectedChannelValues?: {[key: number]: string}
  validateDuplicates?: boolean
}

interface ValidationResult {
  duplicates: {[key: string]: number[]}
  isValid: boolean
  message?: string
}

const ARCChannelConfigDialog: React.FC<ARCChannelConfigDialogProps> = ({
  maxChannelCount,
  onClose,
  onSave,
  options = [],
  selectedChannelValues = {},
  validateDuplicates = true,
}) => {
  const popupRef = useRef<HTMLDivElement>(null)

  // Auto-populate logic: if no selected values provided but maxChannelCount exists,
  // set default count to maxChannelCount
  const initialChannelCount =
    Object.keys(selectedChannelValues).length === 0 && maxChannelCount
      ? maxChannelCount
      : Object.keys(selectedChannelValues).length > 0
        ? Math.max(...Object.keys(selectedChannelValues).map(Number))
        : 0

  // Auto-populate channel values based on index if no selected values provided
  const initialChannelValues = useMemo(() => {
    if (Object.keys(selectedChannelValues).length > 0) {
      return selectedChannelValues
    }

    if (maxChannelCount && Object.keys(selectedChannelValues).length === 0) {
      const autoValues: {[key: number]: string} = {}
      for (let i = 0; i < maxChannelCount; i++) {
        // Use options array values on index basis, or fallback to dynamic channel
        // naming
        autoValues[i] = options[i] || `channel_${i}`
      }
      return autoValues
    }

    return selectedChannelValues
  }, [selectedChannelValues, maxChannelCount, options])

  // State for number of channels - initialize with calculated value
  const [channelCount, setChannelCount] = useState<number>(initialChannelCount)

  // State for channel values - initialize with calculated values
  const [channelValues, setChannelValues] = useState<{[key: number]: string}>(
    initialChannelValues,
  )

  // Handle escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  // Prevent body scrolling when popup is open
  useEffect(() => {
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Track previous channel count to detect changes
  const prevChannelCountRef = useRef<number>(channelCount)

  // Update channel values when count changes
  useEffect(() => {
    // Only proceed if channel count actually changed
    if (prevChannelCountRef.current === channelCount) {
      return
    }

    setChannelValues((prevChannelValues) => {
      // Create a new object with the current channel count
      const newChannelValues = {...prevChannelValues}

      // Add new channels if needed
      for (let i = 0; i < channelCount; i++) {
        if (!newChannelValues[i]) {
          // Use options array values on index basis, or fallback to dynamic channel
          // naming
          newChannelValues[i] = options[i] || `channel_${i}`
        }
      }

      // Remove extra channels if count decreased
      Object.keys(newChannelValues).forEach((key) => {
        const channelNumber = parseInt(key, 10)
        if (channelNumber >= channelCount) {
          delete newChannelValues[channelNumber]
        }
      })

      return newChannelValues
    })

    // Update the previous channel count ref
    prevChannelCountRef.current = channelCount
  }, [channelCount, options])

  // Handle channel count change
  const handleChannelCountChange = (value: string) => {
    const count = parseInt(value, 10)
    if (
      !isNaN(count) &&
      count >= 0 &&
      (maxChannelCount === undefined || count <= maxChannelCount)
    ) {
      setChannelCount(count)
    }
  }

  // Handle channel value change
  const handleChannelValueChange = (
    channelNumber: number,
    value: string | string[] | null,
  ) => {
    // Handle null value and convert array to string if needed (take first value)
    const stringValue =
      value === null ? "" : Array.isArray(value) ? value[0] || "" : value || ""

    setChannelValues((prev) => ({
      ...prev,
      [channelNumber]: stringValue,
    }))
  }

  // Validate channel values for duplicates
  const validation: ValidationResult = useMemo(() => {
    if (!validateDuplicates) {
      return {
        duplicates: {},
        isValid: true,
      }
    }

    const duplicates: {[key: string]: number[]} = {}
    const valueToChannels: {[key: string]: number[]} = {}

    // Group channels by their values (excluding empty values)
    Object.entries(channelValues).forEach(([channelKey, value]) => {
      if (value && value.trim() !== "") {
        const trimmedValue = value.trim()
        if (!valueToChannels[trimmedValue]) {
          valueToChannels[trimmedValue] = []
        }
        valueToChannels[trimmedValue].push(parseInt(channelKey, 10))
      }
    })

    // Find duplicates
    Object.entries(valueToChannels).forEach(([value, channels]) => {
      if (channels.length > 1) {
        duplicates[value] = channels
      }
    })

    const isValid = Object.keys(duplicates).length === 0
    const message = isValid
      ? undefined
      : `Duplicate values found: ${Object.keys(duplicates).join(", ")}`

    return {
      duplicates,
      isValid,
      message,
    }
  }, [channelValues, validateDuplicates])

  // Check if a channel has a duplicate value
  const isChannelDuplicate = (channelNumber: number): boolean => {
    const channelValue = channelValues[channelNumber]
    if (!channelValue || channelValue.trim() === "") {
      return false
    }

    const trimmedValue = channelValue.trim()
    return validation.duplicates[trimmedValue]?.includes(channelNumber) || false
  }

  // Handle save button click
  const handleSave = () => {
    if (onSave) {
      onSave(channelValues)
    }
    onClose()
  }

  // Generate extended options for dropdowns
  const extendedOptions = useMemo(() => {
    const allOptions = [...options]

    // Add missing channels up to the current channel count, not maxChannelCount
    if (options.length < channelCount) {
      for (let i = options.length; i < channelCount; i++) {
        allOptions.push(`channel_${i}`)
      }
    }

    return allOptions
  }, [options, channelCount])

  // Generate channel inputs
  const renderChannelInputs = () => {
    const inputs = []

    for (let i = 0; i < channelCount; i++) {
      const displayLabel = `Channel ${i}`
      const isDuplicate = isChannelDuplicate(i)
      const currentValue = channelValues[i] || ""

      // Create options array with current value included for filtering support
      const optionsWithCurrentValue =
        currentValue && !extendedOptions.includes(currentValue)
          ? [...extendedOptions, currentValue]
          : extendedOptions

      inputs.push(
        <div key={i} className="arc-channel-config-item">
          <div className="arc-channel-config-row">
            <label className="arc-channel-config-label">{displayLabel}</label>
            <div className="arc-channel-config-input">
              <ARCCombobox
                error={isDuplicate}
                filterable
                fullWidth
                hint={isDuplicate ? "Duplicate value" : undefined}
                onChange={(value) => handleChannelValueChange(i, value)}
                options={optionsWithCurrentValue}
                placeholder={displayLabel}
                value={currentValue}
              />
            </div>
          </div>
        </div>,
      )
    }

    return inputs
  }

  return (
    <div className="arc-popup-overlay">
      <div
        ref={popupRef}
        aria-labelledby="arc-popup-title"
        aria-modal="true"
        className="arc-popup-content"
        role="dialog"
      >
        <div className="arc-popup-header">
          <h2 className="arc-popup-title" id="arc-popup-title">
            Channel Configuration
          </h2>
          <Button
            aria-label="Close"
            color="neutral"
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="arc-popup-body">
          <div className="arc-channel-config-container">
            <div className="arc-channel-config-row">
              <label className="arc-channel-config-label-config">
                Number of channels:
              </label>
              <div className="arc-channel-config-input-wrapper">
                <ARCTextInput
                  max={maxChannelCount}
                  min={0}
                  onChange={handleChannelCountChange}
                  size="sm"
                  type="number"
                  value={channelCount.toString()}
                />
              </div>
            </div>

            {channelCount > 0 && (
              <>
                <div className="arc-channel-config-separator"></div>
                {!validation.isValid && (
                  <div className="arc-channel-config-validation-message">
                    {validation.message}
                  </div>
                )}
                <div className="arc-channel-config-channels">
                  {renderChannelInputs()}
                </div>
              </>
            )}

            {channelCount === 0 && (
              <div className="arc-channel-config-empty-message">
                Please specify the number of channels to configure
              </div>
            )}
          </div>
        </div>

        <div className="arc-popup-footer">
          <div className="arc-popup-footer-buttons">
            <Button color="neutral" onClick={onClose} variant="fill">
              Cancel
            </Button>
            <Button color="primary" onClick={handleSave} variant="fill">
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ARCChannelConfigDialog
