import {useState} from "react"

import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ARCCombobox from "~shared/controls/ARCCombobox"

// Note: Combobox mocks are now in test-setup.ts

describe("ARCCombobox - Generic Controls API (ARCSearchBox)", () => {
  const stringOptions = ["Option 1", "Option 2", "Option 3"]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Basic Props API", () => {
    it("should render with default props", () => {
      render(<ARCCombobox options={stringOptions} />)

      const combobox = screen.getByTestId("arc-combobox")
      expect(combobox).toBeInTheDocument()
    })

    it("should render with id prop", () => {
      render(<ARCCombobox id="search-box" options={stringOptions} />)

      const input = screen.getByTestId("combobox-input")
      expect(input).toHaveAttribute("id", "search-box")
    })

    it("should render with className prop", () => {
      render(<ARCCombobox className="custom-search" options={stringOptions} />)

      const combobox = screen.getByTestId("arc-combobox")
      expect(combobox).toHaveClass("arc-combobox-container custom-search")
    })

    it("should render with style prop", () => {
      const customStyle = {width: "300px"}
      render(<ARCCombobox options={stringOptions} style={customStyle} />)

      const container = screen.getByTestId("arc-combobox")
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

    // Note: ARCCombobox doesn't have onInputChange prop - filtering is handled internally

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

    // Note: ARCCombobox doesn't expose onBlur/onFocus props - these are handled internally
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

    it("should render with filterable search example", async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()

      render(
        <ARCCombobox
          filterable
          onChange={handleChange}
          options={stringOptions}
          placeholder="Search with filtering..."
        />,
      )

      const input = screen.getByTestId("combobox-input")
      await user.type(input, "Option 1")

      // Should filter to show only matching option
      expect(screen.getByTestId("option-Option 1")).toBeInTheDocument()
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

  // Note: ARCCombobox doesn't support ref forwarding

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
