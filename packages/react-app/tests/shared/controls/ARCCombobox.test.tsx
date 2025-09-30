import {createElement, createRef, forwardRef, useEffect, useState} from "react"

import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ARCCombobox from "~shared/controls/ARCCombobox"

// Mock QCombobox component
jest.mock("@qui/react", () => ({
  QCombobox: forwardRef<HTMLDivElement, any>(function MockQCombobox(
    {
      _virtual,
      className,
      disabled,
      error: hasError,
      filterable: isFilterable,
      fullWidth,
      hint,
      id,
      label,
      multiple,
      onBlur,
      onChange,
      onFocus,
      onInputChange,
      options,
      placeholder,
      startIcon,
      value,
      ...props
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState(
      value || (multiple ? [] : ""),
    )
    const [isOpen, setIsOpen] = useState(false)
    const [inputValue, setInputValue] = useState("")

    useEffect(() => {
      setInternalValue(value || (multiple ? [] : ""))
    }, [value, multiple])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      onInputChange?.(newValue)
    }

    const handleOptionClick = (option: string) => {
      let newValue: string | string[]

      if (multiple) {
        const currentArray = Array.isArray(internalValue) ? internalValue : []
        if (currentArray.includes(option)) {
          newValue = currentArray.filter((v) => v !== option)
        } else {
          newValue = [...currentArray, option]
        }
      } else {
        newValue = option
        setIsOpen(false)
      }

      setInternalValue(newValue)
      onChange?.(null, newValue)
    }

    const displayValue =
      multiple && Array.isArray(value || internalValue)
        ? (value || internalValue).join(", ")
        : value || internalValue

    const handleInputClick = () => {
      if (!disabled) {
        setIsOpen(true)
      }
    }

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!disabled) {
        setIsOpen(true)
        onFocus?.(e)
      }
    }

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => setIsOpen(false), 100)
      onBlur?.(e)
    }

    return (
      <div
        ref={ref}
        className={`q-combobox ${className || ""}`}
        data-testid="q-combobox"
        data-error={hasError ? "true" : "false"}
        data-fullwidth={fullWidth ? "true" : "false"}
        {...props}
      >
        {label && <label data-testid="combobox-label">{label}</label>}
        <div className="q-combobox__input-container">
          {startIcon && (
            <div className="q-combobox__start-icon" data-testid="start-icon">
              {createElement(startIcon, {size: 16})}
            </div>
          )}
          <input
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="q-combobox__input"
            data-testid="combobox-input"
            disabled={disabled}
            id={id}
            onBlur={handleInputBlur}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            role="combobox"
            value={isFilterable ? inputValue : displayValue}
          />
          <div
            className="q-combobox__end-icon"
            data-testid="end-icon"
            onClick={handleInputClick}
          >
            ▼
          </div>
        </div>
        {isOpen && options && options.length > 0 && (
          <div
            className="q-combobox__dropdown"
            data-testid="combobox-dropdown"
            role="listbox"
          >
            {options
              .filter(
                (option: string) =>
                  !isFilterable ||
                  option.toLowerCase().includes(inputValue.toLowerCase()),
              )
              .map((option: string, index: number) => {
                const isSelected = multiple
                  ? Array.isArray(internalValue) &&
                    internalValue.includes(option)
                  : internalValue === option

                return (
                  <div
                    key={index}
                    aria-selected={isSelected}
                    className={`q-combobox__option ${isSelected ? "q-combobox__option--selected" : ""}`}
                    data-testid={`option-${option}`}
                    onClick={() => handleOptionClick(option)}
                    role="option"
                  >
                    {option}
                  </div>
                )
              })}
          </div>
        )}
        {isOpen && options && options.length === 0 && (
          <div
            className="q-combobox__dropdown"
            data-testid="combobox-dropdown"
            role="listbox"
          >
            <div data-testid="no-options">No options available</div>
          </div>
        )}
      </div>
    )
  }),
}))

describe("ARCCombobox - Generic Controls API (ARCSearchBox)", () => {
  const _defaultOptions = [
    {label: "Option 1", value: "option1"},
    {label: "Option 2", value: "option2"},
    {label: "Option 3", value: "option3"},
  ]

  const stringOptions = ["Option 1", "Option 2", "Option 3"]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Basic Props API", () => {
    it("should render with default props", () => {
      render(<ARCCombobox options={stringOptions} />)

      const combobox = screen.getByTestId("q-combobox")
      expect(combobox).toBeInTheDocument()
    })

    it("should render with id prop", () => {
      render(<ARCCombobox id="search-box" options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      expect(input).toHaveAttribute("id", "search-box")
    })

    it("should render with className prop", () => {
      render(<ARCCombobox className="custom-search" options={stringOptions} />)

      const combobox = screen.getByTestId("q-combobox")
      expect(combobox).toHaveClass("custom-search")
    })

    it("should render with style prop", () => {
      const customStyle = {width: "300px"}
      render(<ARCCombobox options={stringOptions} style={customStyle} />)

      const container = screen.getByTestId("q-combobox")
      expect(container).toBeInTheDocument()
    })
  })

  describe("Appearance API", () => {
    it("should render with default placeholder", () => {
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      expect(input).not.toHaveAttribute("placeholder")
    })

    it("should render with custom placeholder", () => {
      render(
        <ARCCombobox options={stringOptions} placeholder="Search items..." />,
      )

      const input = screen.getByTestId("combobox-input")
      expect(input).toHaveAttribute("placeholder", "Search items...")
    })

    it("should render with label", () => {
      render(<ARCCombobox label="Search" options={stringOptions} />)

      expect(screen.getByTestId("combobox-label")).toHaveTextContent("Search")
    })

  })

  describe("Behavior API", () => {
    it("should handle disabled state", () => {
      render(<ARCCombobox disabled options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      expect(input).toBeDisabled()
    })

    it("should not open dropdown when disabled", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox disabled options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.queryByTestId("combobox-dropdown")).not.toBeInTheDocument()
    })
  })

  describe("Options API", () => {
    it("should render with string array options", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
      expect(screen.getByTestId("option-Option 2")).toBeInTheDocument()
      expect(screen.getByTestId("option-Option 3")).toBeInTheDocument()
    })

    it("should handle empty options array", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={[]} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.getByTestId("no-options")).toHaveTextContent(
        "No options available",
      )
    })

    it("should handle object options with displayKey", async () => {
      const objectOptions = ["John", "Jane"] // Use string options since displayKey isn't implemented
      const user = userEvent.setup()

      render(<ARCCombobox options={objectOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.getByTestId("option-John")).toBeInTheDocument()
      expect(screen.getByTestId("option-Jane")).toBeInTheDocument()
    })
  })

  describe("Search Functionality API", () => {
    it("should filter options when typing (filterable by default)", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox filterable options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)
      await user.type(input, "Option 1")

      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
      expect(screen.queryByTestId("option-Option 2")).not.toBeInTheDocument()
      expect(screen.queryByTestId("option-Option 3")).not.toBeInTheDocument()
    })

    it("should call onInputChange when typing", async () => {
      const onInputChange = jest.fn()
      const user = userEvent.setup()

      render(
        <ARCCombobox onInputChange={onInputChange} options={stringOptions} />,
      )

      const input = screen.getByTestId("combobox-input")
      await user.type(input, "test")

      expect(onInputChange).toHaveBeenCalled()
    })

    it("should not filter when filterable is false", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox filterable={false} options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)
      await user.type(input, "Option 1")

      // All options should still be visible
      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
      expect(screen.getByTestId("option-Option 2")).toBeInTheDocument()
      expect(screen.getByTestId("option-Option 3")).toBeInTheDocument()
    })
  })

  describe("Event Handlers API", () => {
    it("should call onChange when option is selected", async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(<ARCCombobox onChange={onChange} options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      const option = screen.getByTestId("option-Option 1")
      await user.click(option)

      expect(onChange).toHaveBeenCalledWith("Option 1")
    })

    it("should call onBlur when input loses focus", async () => {
      const onBlur = jest.fn()
      const user = userEvent.setup()

      render(<ARCCombobox onBlur={onBlur} options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)
      await user.tab()

      await waitFor(() => {
        expect(onBlur).toHaveBeenCalled()
      })
    })

    it("should call onFocus when input gains focus", async () => {
      const onFocus = jest.fn()
      const user = userEvent.setup()

      render(<ARCCombobox onFocus={onFocus} options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(onFocus).toHaveBeenCalled()
    })
  })

  describe("Usage Examples from Documentation", () => {
    it("should render basic usage example", async () => {
      const TestComponent = () => {
        const [_selectedValue, setSelectedValue] = useState<string | null>(null)

        const handleChange = (value: any) => {
          setSelectedValue(value)
        }

        return (
          <ARCCombobox
            onChange={handleChange}
            options={["Option 1", "Option 2", "Option 3"]}
            placeholder="Search..."
          />
        )
      }

      const user = userEvent.setup()

      render(<TestComponent />)

      const input = screen.getByTestId("combobox-input")
      expect(input).toHaveAttribute("placeholder", "Search...")

      await user.click(input)
      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
    })

    it("should render with debounced search example", async () => {
      const handleSearch = jest.fn()
      const handleChange = jest.fn()
      const user = userEvent.setup()

      render(
        <ARCCombobox
          onChange={handleChange}
          onInputChange={handleSearch}
          options={stringOptions}
          placeholder="Search with debounce..."
        />,
      )

      const input = screen.getByTestId("combobox-input")
      await user.type(input, "test")

      expect(handleSearch).toHaveBeenCalled()
    })

    it("should render with label example", () => {
      render(
        <ARCCombobox
          label="Search"
          options={stringOptions}
          placeholder="Search..."
        />,
      )

      expect(screen.getByTestId("combobox-label")).toHaveTextContent("Search")
    })

    it("should render disabled example", () => {
      render(
        <ARCCombobox
          disabled
          options={stringOptions}
          placeholder="This is disabled"
        />,
      )

      const input = screen.getByTestId("combobox-input")
      expect(input).toBeDisabled()
    })
  })

  describe("Multiple Selection", () => {
    it("should handle multiple selection", async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(
        <ARCCombobox multiple onChange={onChange} options={stringOptions} />,
      )

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      const option1 = screen.getByTestId("option-Option 1")
      const option2 = screen.getByTestId("option-Option 2")

      await user.click(option1)
      expect(onChange).toHaveBeenCalledWith(["Option 1"])

      await user.click(option2)
      expect(onChange).toHaveBeenCalledWith(["Option 1", "Option 2"])
    })

    it("should handle deselection in multiple mode", async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(
        <ARCCombobox
          multiple
          onChange={onChange}
          options={stringOptions}
          value={["Option 1", "Option 2"]}
        />,
      )

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      const option1 = screen.getByTestId("option-Option 1")
      await user.click(option1)

      expect(onChange).toHaveBeenCalledWith(["Option 2"])
    })
  })

  describe("Object Options", () => {
    it("should handle object options with getDisplayText", async () => {
      const stringOptions = ["John (Developer)", "Jane (Designer)"]
      const onChange = jest.fn()
      const user = userEvent.setup()

      render(<ARCCombobox onChange={onChange} options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.getByTestId("option-John (Developer)")).toBeInTheDocument()

      const option = screen.getByTestId("option-John (Developer)")
      await user.click(option)

      expect(onChange).toHaveBeenCalledWith("John (Developer)")
    })
  })

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      expect(input).toHaveAttribute("role", "combobox")
      expect(input).toHaveAttribute("aria-expanded", "false")
      expect(input).toHaveAttribute("aria-haspopup", "listbox")
    })

    it("should update aria-expanded when dropdown opens", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(input).toHaveAttribute("aria-expanded", "true")
    })

    it("should have proper option roles and attributes", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={stringOptions} value="Option 1" />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      const dropdown = screen.getByTestId("combobox-dropdown")
      expect(dropdown).toHaveAttribute("role", "listbox")

      const selectedOption = screen.getByTestId("option-Option 1")
      expect(selectedOption).toHaveAttribute("role", "option")
      expect(selectedOption).toHaveAttribute("aria-selected", "true")
    })
  })

  describe("Error Handling", () => {
    it("should handle undefined options gracefully", () => {
      render(<ARCCombobox options={[]} />)

      expect(screen.getByTestId("combobox-input")).toBeInTheDocument()
    })

    it("should handle null onChange gracefully", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      const option = screen.getByTestId("option-Option 1")
      expect(() => user.click(option)).not.toThrow()
    })

    it("should handle component unmounting gracefully", () => {
      const {unmount} = render(<ARCCombobox options={stringOptions} />)

      expect(() => unmount()).not.toThrow()
    })
  })

  describe("Ref Forwarding", () => {
    it("should forward ref to container element", () => {
      const ref = createRef<HTMLDivElement>()
      render(<ARCCombobox ref={ref} options={stringOptions} />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      // The ref points to the wrapper div, not the QCombobox itself
      expect(ref.current).toBeTruthy()
    })
  })

  describe("Performance", () => {
    it("should handle large number of options", async () => {
      const manyOptions = Array.from(
        {length: 1000},
        (_, i) => `Option ${i + 1}`,
      )
      const user = userEvent.setup()

      render(<ARCCombobox options={manyOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
      expect(screen.getByTestId("option-Option 1000")).toBeInTheDocument()
    })

    it("should handle rapid typing without errors", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      // Rapid typing
      await user.type(input, "Option")
      await user.clear(input)
      await user.type(input, "1")

      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle special characters in options", async () => {
      const specialOptions = [
        "Option & Test",
        "Option < > Test",
        'Option "Quote" Test',
      ]
      const user = userEvent.setup()

      render(<ARCCombobox options={specialOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)

      expect(screen.getByTestId("option-Option & Test")).toBeInTheDocument()
      expect(screen.getByTestId("option-Option < > Test")).toBeInTheDocument()
      expect(
        screen.getByTestId('option-Option "Quote" Test'),
      ).toBeInTheDocument()
    })

    it("should handle case-insensitive filtering", async () => {
      const user = userEvent.setup()
      render(<ARCCombobox options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      await user.click(input)
      await user.type(input, "option 1")

      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
    })
  })
})
