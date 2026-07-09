/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import '@testing-library/jest-dom';
import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// jsdom does not implement scrollIntoView — add a no-op stub so components
// that call it (e.g. ParameterDetailPane auto-scroll) do not throw in tests.
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Suppress console warnings in tests (optional)
const originalError = console.error;
// Known QUI library behaviour: custom component props (startIcon, onFocusChange,
// etc.) are forwarded to underlying DOM elements. React 19 passes 'Warning: %s'
// as args[0] and the interpolated message as args[1]; match both positions.
const QUI_PROP_LEAK_PATTERNS = [
  /React does not recognize the `\w+` prop on a DOM element/,
  /Unknown event handler property `\w+`\. It will be ignored/,
  /Received `\w+` for a non-boolean attribute `\w+`/,
];
function isQuiPropLeak(args: unknown[]): boolean {
  return args.some(
    (a) =>
      typeof a === 'string' && QUI_PROP_LEAK_PATTERNS.some((re) => re.test(a)),
  );
}
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
        isQuiPropLeak(args))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global mocks for @qualcomm-ui/react components
jest.mock('@qualcomm-ui/react/text-input', () => ({
  TextInput: jest.fn().mockImplementation((props) => {
    const {
      autoFocus,
      className,
      clearable,
      defaultValue,
      disabled,
      errorText,
      fullWidth,
      hint,
      id,
      inputProps = {},
      label,
      name,
      onBlur,
      onClear,
      onFocus,
      onFocusChange: _onFocusChange,
      onValueChange,
      placeholder,
      readOnly,
      size,
      startIcon: _startIcon,
      style,
      value,
      ...restProps
    } = props;

    // Filter out non-DOM props — restProps should now be empty for standard QUI usage
    const cleanProps = restProps;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange(event.target.value, event);
      }
    };

    const handleClear = () => {
      // When clear is clicked, set value to empty and call both callbacks
      if (onValueChange) {
        onValueChange('', {
          target: {value: ''},
        } as React.ChangeEvent<HTMLInputElement>);
      }
      if (onClear) {
        onClear();
      }
    };

    return createElement(
      'div',
      {
        className,
        'data-testid': 'q-text-input',
        style,
        ...cleanProps,
      },
      label &&
        createElement(
          'label',
          {'aria-label': 'qtext-input', 'data-testid': 'input-label'},
          label,
        ),
      createElement('input', {
        'aria-label': label ? undefined : 'qtext-input',
        autoFocus,
        'data-full-width': fullWidth,
        'data-size': size,
        'data-testid': 'text-input',
        defaultValue,
        disabled,
        id,
        max: inputProps?.max,
        maxLength: inputProps?.maxLength,
        min: inputProps?.min,
        minLength: inputProps?.minLength,
        name,
        onBlur,
        onChange: handleChange,
        onFocus,
        pattern: inputProps?.pattern,
        placeholder,
        readOnly,
        step: inputProps?.step,
        type: inputProps?.type || 'text',
        value,
      }),
      clearable &&
        createElement(
          'button',
          {
            'aria-label': 'clear',
            'data-testid': 'clear-button',
            onClick: handleClear,
            type: 'button',
          },
          '×',
        ),
      errorText &&
        createElement(
          'div',
          {'data-testid': 'error-message', role: 'alert'},
          errorText,
        ),
      hint && createElement('div', {'data-testid': 'hint-message'}, hint),
    );
  }),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: jest
    .fn()
    .mockImplementation(
      ({
        children,
        className,
        disabled,
        endIcon: _endIcon,
        iconPosition: _iconPosition,
        onClick,
        startIcon: _startIcon,
        type = 'button',
        ...props
      }) => {
        return createElement(
          'button',
          {
            className,
            'data-testid': 'q-button',
            disabled,
            onClick,
            type,
            ...props,
          },
          children,
        );
      },
    ),
  IconButton: jest
    .fn()
    .mockImplementation(
      ({
        'aria-label': ariaLabel,
        children,
        className,
        disabled,
        onClick,
        ...props
      }) => {
        return createElement(
          'button',
          {
            'aria-label': ariaLabel,
            className,
            'data-testid': 'q-icon-button',
            disabled,
            onClick,
            ...props,
          },
          children,
        );
      },
    ),
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: jest
    .fn()
    .mockImplementation(
      ({checked, className, disabled, label, onChange, ...props}) => {
        return createElement(
          'label',
          {
            className,
            'data-testid': 'q-checkbox-label',
          },
          createElement('input', {
            checked,
            'data-testid': 'q-checkbox',
            disabled,
            onChange,
            type: 'checkbox',
            ...props,
          }),
          label && createElement('span', null, label),
        );
      },
    ),
}));

jest.mock('@qualcomm-ui/react/combobox', () => ({
  Combobox: {
    Content: jest
      .fn()
      .mockImplementation(({children, mockContext, ...props}) => {
        return createElement(
          'div',
          {'data-testid': 'combobox-content', ...props},
          Children.map(children, (child) => {
            if (isValidElement(child)) {
              return cloneElement(child as React.ReactElement<any>, {
                mockContext,
              });
            }
            return child;
          }),
        );
      }),
    Control: jest
      .fn()
      .mockImplementation(({children, mockContext, ...props}) => {
        return createElement(
          'div',
          {'data-testid': 'combobox-control', ...props},
          Children.map(children, (child) => {
            if (isValidElement(child)) {
              return cloneElement(child as React.ReactElement<any>, {
                mockContext,
              });
            }
            return child;
          }),
        );
      }),
    ErrorText: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement(
        'div',
        {'data-testid': 'combobox-error', role: 'alert', ...props},
        children,
      );
    }),
    Hint: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement(
        'div',
        {'data-testid': 'combobox-hint', ...props},
        children,
      );
    }),
    Input: jest
      .fn()
      .mockImplementation(({mockContext, placeholder, ...props}) => {
        // Filter out mockContext from props to prevent React warnings
        const {mockContext: _mockContext, ...cleanProps} = {
          mockContext,
          ...props,
        };

        return createElement('input', {
          'aria-expanded': mockContext?.isOpen ? 'true' : 'false',
          'aria-haspopup': 'listbox',
          'data-testid': 'combobox-input',
          disabled: mockContext?.disabled,
          id: mockContext?.id,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            mockContext?.setInputValue(e.target.value);
          },
          onClick: () => mockContext?.setIsOpen(true),
          placeholder,
          role: 'combobox',
          value: mockContext?.inputValue || '',
          ...cleanProps,
        });
      }),
    Items: jest.fn().mockImplementation(({mockContext, ..._props}) => {
      const {collection, multiple, onValueChange, value} = mockContext || {};

      if (!collection || !collection.items || collection.items.length === 0) {
        return createElement(
          'div',
          {'data-testid': 'no-options'},
          'No options available',
        );
      }

      return createElement(
        'div',
        {'data-testid': 'combobox-dropdown', role: 'listbox'},
        collection.items.map(
          (item: {label: string; value: string}, index: number) => {
            const valueArray = Array.isArray(value) ? value : [];
            const isSelected = multiple
              ? valueArray.includes(item.value)
              : valueArray.includes(item.value);

            return createElement(
              'div',
              {
                'aria-selected': isSelected,
                'data-testid': `option-${item.value}`,
                key: index,
                onClick: () => {
                  let newValue: string[];
                  if (multiple) {
                    if (valueArray.includes(item.value)) {
                      newValue = valueArray.filter(
                        (v: string) => v !== item.value,
                      );
                    } else {
                      newValue = [...valueArray, item.value];
                    }
                  } else {
                    newValue = [item.value];
                  }
                  onValueChange?.(newValue);
                },
                role: 'option',
              },
              item.label,
            );
          },
        ),
      );
    }),
    Label: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement(
        'label',
        {'data-testid': 'combobox-label', ...props},
        children,
      );
    }),
    Positioner: jest
      .fn()
      .mockImplementation(({children, mockContext, ...props}) => {
        return mockContext?.isOpen
          ? createElement(
              'div',
              {'data-testid': 'combobox-positioner', ...props},
              Children.map(children, (child) => {
                if (isValidElement(child)) {
                  return cloneElement(child as React.ReactElement<any>, {
                    mockContext,
                  });
                }
                return child;
              }),
            )
          : null;
      }),
    Root: jest
      .fn()
      .mockImplementation(
        ({
          children,
          collection,
          disabled,
          id,
          inputBehavior,
          multiple,
          onValueChange,
          value = [],
        }) => {
          const [isOpen, setIsOpen] = useState(false);
          const [internalValue, setInternalValue] = useState<string[]>(value);
          const [inputValue, setInputValue] = useState('');

          useEffect(() => {
            setInternalValue(value);
          }, [value]);

          const handleValueChange = (newValue: string[]) => {
            setInternalValue(newValue);
            if (onValueChange) {
              // This simulates the ARCCombobox's onValueChange prop being called
              // The ARCCombobox will then process this and call the user's onChange
              onValueChange({value: newValue});
            }
          };

          // Filter items based on input value when filterable
          const filteredItems = useMemo(() => {
            if (!collection?.items) {
              return [];
            }
            if (inputBehavior !== 'autocomplete' || !inputValue) {
              return collection.items;
            }
            return collection.items.filter(
              (item: {label: string; value: string}) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase()),
            );
          }, [collection?.items, inputBehavior, inputValue]);

          // Store context in a ref to share between components
          const contextRef = useRef({
            collection: {items: filteredItems},
            disabled,
            id,
            inputValue,
            isOpen,
            multiple,
            onValueChange: handleValueChange,
            setInputValue,
            setIsOpen,
            value: internalValue,
          });

          // Update context ref
          contextRef.current = {
            collection: {items: filteredItems},
            disabled,
            id,
            inputValue,
            isOpen,
            multiple,
            onValueChange: handleValueChange,
            setInputValue,
            setIsOpen,
            value: internalValue,
          };

          return createElement(
            'div',
            {
              'data-disabled': disabled,
              'data-open': isOpen,
              'data-testid': 'combobox-root',
            },
            Children.map(children, (child) => {
              if (isValidElement(child)) {
                return cloneElement(child as React.ReactElement<any>, {
                  mockContext: contextRef.current,
                });
              }
              return child;
            }),
          );
        },
      ),
    Trigger: jest.fn().mockImplementation(({mockContext, ...props}) => {
      return createElement(
        'button',
        {
          'data-testid': 'combobox-trigger',
          onClick: () => mockContext?.setIsOpen((prev: boolean) => !prev),
          ...props,
        },
        '▼',
      );
    }),
  },
}));

jest.mock('@qualcomm-ui/react/menu', () => {
  const passthrough = ({children}: {children?: React.ReactNode}) =>
    createElement('div', {}, children);
  const Item = ({
    children,
    disabled,
    onSelect,
    value,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
    value: string;
  }) =>
    createElement(
      'button',
      {
        'data-menu-item': value,
        disabled,
        onClick: () => onSelect && onSelect(),
        type: 'button',
      },
      children,
    );
  return {
    Menu: {
      Content: passthrough,
      Item,
      ItemLabel: passthrough,
      Positioner: passthrough,
      Root: ({children}: {children?: React.ReactNode}) =>
        createElement('div', {'data-testid': 'menu-root'}, children),
      Separator: () => createElement('hr', {'data-testid': 'menu-separator'}),
    },
  };
});

jest.mock('@qualcomm-ui/react/divider', () => ({
  Divider: jest
    .fn()
    .mockImplementation(({className, orientation = 'horizontal', ...props}) => {
      return createElement('hr', {
        className,
        'data-orientation': orientation,
        'data-testid': 'q-divider',
        ...props,
      });
    }),
}));

jest.mock('@qualcomm-ui/react/progress-ring', () => ({
  ProgressRing: jest
    .fn()
    .mockImplementation(({className, size, value, ...props}) => {
      return createElement(
        'div',
        {
          'aria-valuenow': value,
          className,
          'data-size': size,
          'data-testid': 'q-progress-ring',
          'data-value': value,
          role: 'progressbar',
          ...props,
        },
        value !== undefined ? `${value}%` : 'Loading...',
      );
    }),
}));

jest.mock('@qualcomm-ui/react/toast', () => ({
  createToaster: jest.fn().mockReturnValue({
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    show: jest.fn(),
  }),
  Toaster: jest.fn().mockImplementation(({children, ...props}) => {
    return createElement(
      'div',
      {
        'data-testid': 'q-toaster',
        ...props,
      },
      children,
    );
  }),
}));

jest.mock('@qualcomm-ui/react-core/collection', () => ({
  useListCollection: jest.fn().mockImplementation(({initialItems = []}) => ({
    collection: {
      items: initialItems,
    },
    selectedKeys: new Set(),
    setSelectedKeys: jest.fn(),
  })),
}));

jest.mock('@qualcomm-ui/qds-core/inline-notification', () => ({
  QdsNotificationEmphasis: {
    HIGH: 'high',
    LOW: 'low',
    MEDIUM: 'medium',
  },
}));

jest.mock('@qualcomm-ui/react/breadcrumbs', () => ({
  Breadcrumbs: {
    Item: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement('li', {...props}, children);
    }),
    ItemRoot: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement('span', {...props}, children);
    }),
    ItemSeparator: jest.fn().mockImplementation(({...props}) => {
      return createElement('span', {'aria-hidden': 'true', ...props}, '/');
    }),
    ItemTrigger: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement('span', {...props}, children);
    }),
    List: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement('ol', {...props}, children);
    }),
    Root: jest.fn().mockImplementation(({children, className, ...props}) => {
      return createElement(
        'nav',
        {className, role: 'navigation', ...props},
        children,
      );
    }),
  },
}));

jest.mock('@qualcomm-ui/react/inline-icon-button', () => ({
  InlineIconButton: jest
    .fn()
    .mockImplementation(
      ({'aria-label': ariaLabel, icon, onClick, ...props}) => {
        return createElement(
          'button',
          {
            'aria-label': ariaLabel,
            'data-testid': 'inline-icon-button',
            onClick,
            ...props,
          },
          typeof icon === 'string' ? icon : '⚡',
        );
      },
    ),
}));

jest.mock('@qualcomm-ui/react/popover', () => ({
  Popover: {
    Content: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement(
        'div',
        {'data-testid': 'popover-content', ...props},
        children,
      );
    }),
    Positioner: jest.fn().mockImplementation(({children, ...props}) => {
      return createElement(
        'div',
        {'data-testid': 'popover-positioner', ...props},
        children,
      );
    }),
    Root: jest.fn().mockImplementation(({children, open, ...props}) => {
      return createElement(
        'div',
        {'data-open': open, 'data-testid': 'popover-root', ...props},
        children,
      );
    }),
    Trigger: jest.fn().mockImplementation(({children, ...props}) => {
      // Handle render prop pattern
      if (typeof children === 'function') {
        const triggerProps = {
          'aria-expanded': false,
          'aria-haspopup': 'dialog',
          onClick: jest.fn(),
          onKeyDown: jest.fn(),
        };
        return createElement(
          'div',
          {'data-testid': 'popover-trigger', ...props},
          children(triggerProps),
        );
      }

      return createElement(
        'div',
        {'data-testid': 'popover-trigger', ...props},
        children,
      );
    }),
  },
}));

jest.mock('@qualcomm-ui/react-core/portal', () => ({
  Portal: jest.fn().mockImplementation(({children}) => {
    return createElement('div', {'data-testid': 'portal'}, children);
  }),
}));

jest.mock('~shared/providers/theme-provider', () => ({
  Theme: {Dark: 'dark', Light: 'light'},
  ThemeProvider: ({children}: {children: React.ReactNode}) => children,
  useTheme: () => ['light', jest.fn()],
}));

jest.mock('~features/usecase-visualizer/model/visualizer-store-context', () => {
  const actual = jest.requireActual(
    '~features/usecase-visualizer/model/visualizer-store-context',
  );
  const defaultState = {
    containsMatchNodeIds: [] as string[],
    eventHandlers: undefined,
    nodeDisplayConfig: undefined,
    renderNodeContent: undefined,
    searchHighlightById: {} as Record<string, unknown>,
  };
  return {
    ...actual,
    useVisualizerStore: (
      selector: (s: typeof defaultState) => unknown,
    ): unknown => {
      try {
        return actual.useVisualizerStore(
          selector as Parameters<typeof actual.useVisualizerStore>[0],
        );
      } catch {
        return selector(defaultState);
      }
    },
  };
});

jest.mock('@qualcomm-ui/react/tooltip', () => {
  // Tooltip is used two ways in this codebase:
  //   1. Old API: <Tooltip trigger={...}>...</Tooltip>  (flat component)
  //   2. New API: <Tooltip.Root>, <Tooltip.Trigger>, etc. (namespace)
  // The mock must support both: a callable function with namespace properties.
  const TooltipFn = jest
    .fn()
    .mockImplementation(({children, trigger, ...props}) =>
      createElement(
        'div',
        {'data-testid': 'q-tooltip', ...props},
        trigger,
        children,
      ),
    );
  const namespace = {
    Arrow: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('span', {'data-testid': 'tooltip-arrow'}, children),
      ),
    ArrowTip: jest
      .fn()
      .mockImplementation(() =>
        createElement('span', {'data-testid': 'tooltip-arrow-tip'}),
      ),
    Content: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('div', {'data-testid': 'tooltip-content'}, children),
      ),
    Positioner: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('div', {'data-testid': 'tooltip-positioner'}, children),
      ),
    Root: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('div', {'data-testid': 'q-tooltip'}, children),
      ),
    Trigger: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('span', {'data-testid': 'tooltip-trigger'}, children),
      ),
  };
  Object.assign(TooltipFn, namespace);
  return {Tooltip: TooltipFn};
});

jest.mock('@qualcomm-ui/core/tree', () => ({
  createTreeCollection: jest.fn().mockReturnValue({items: []}),
}));

jest.mock('@qualcomm-ui/react/tree', () => {
  const pass = ({children}: {children?: React.ReactNode}) =>
    createElement('div', {}, children);
  return {
    Tree: {
      Branch: pass,
      BranchContent: pass,
      BranchIndentGuide: () => createElement('span'),
      BranchNode: pass,
      BranchTrigger: () =>
        createElement('button', {'data-testid': 'branch-trigger'}),
      Label: jest
        .fn()
        .mockImplementation(({children, onClick}) =>
          createElement(
            'div',
            {'data-testid': 'tree-label', onClick},
            children,
          ),
        ),
      LeafNode: pass,
      NodeIndicator: () => createElement('span'),
      NodeProvider: jest
        .fn()
        .mockImplementation(({children}) => createElement('div', {}, children)),
      NodeText: jest
        .fn()
        .mockImplementation(({children, className}) =>
          createElement(
            'span',
            {className, 'data-testid': 'node-text'},
            children,
          ),
        ),
      Root: jest
        .fn()
        .mockImplementation(({children}) =>
          createElement('div', {'data-testid': 'tree-root'}, children),
        ),
    },
  };
});

jest.mock('@qualcomm-ui/core/select', () => ({
  selectCollection: jest.fn().mockReturnValue({items: []}),
}));

jest.mock('@qualcomm-ui/react/select', () => ({
  Select: jest.fn().mockImplementation(({onValueChange, value}) =>
    createElement('select', {
      'data-testid': 'q-select',
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        onValueChange?.([e.target.value]);
      },
      value: value?.[0] ?? '',
    }),
  ),
}));

jest.mock('@qualcomm-ui/react/switch', () => ({
  Switch: jest
    .fn()
    .mockImplementation(({checked, disabled, label, onCheckedChange}) =>
      createElement(
        'label',
        {'data-testid': 'q-switch'},
        createElement('input', {
          checked: checked ?? false,
          disabled,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
            onCheckedChange?.(e.target.checked);
          },
          type: 'checkbox',
        }),
        label && createElement('span', {}, label),
      ),
    ),
}));

jest.mock('@qualcomm-ui/react/text-area', () => ({
  TextArea: jest.fn().mockImplementation(({defaultValue, readOnly}) =>
    createElement('textarea', {
      'data-testid': 'q-text-area',
      defaultValue,
      readOnly,
    }),
  ),
}));

jest.mock('@qualcomm-ui/react/accordion', () => {
  const pass = ({children}: {children?: React.ReactNode}) =>
    createElement('div', {}, children);
  return {
    Accordion: {
      ItemContent: pass,
      ItemIndicator: () =>
        createElement('span', {'data-testid': 'accordion-indicator'}),
      ItemRoot: jest
        .fn()
        .mockImplementation(({children, value}) =>
          createElement(
            'div',
            {'data-accordion-value': value, 'data-testid': 'accordion-item'},
            children,
          ),
        ),
      ItemTrigger: jest
        .fn()
        .mockImplementation(({children, onClick}) =>
          createElement(
            'button',
            {'data-testid': 'accordion-trigger', onClick},
            children,
          ),
        ),
      Root: jest
        .fn()
        .mockImplementation(
          ({children, onValueChange: _onValueChange, value}) =>
            createElement(
              'div',
              {
                'data-testid': 'accordion-root',
                'data-value': JSON.stringify(value),
              },
              children,
            ),
        ),
    },
  };
});

jest.mock('@qualcomm-ui/react/badge', () => ({
  Badge: jest.fn().mockImplementation(({children, emphasis, size, variant}) =>
    createElement(
      'span',
      {
        'data-emphasis': emphasis,
        'data-size': size,
        'data-testid': 'q-badge',
        'data-variant': variant,
      },
      children,
    ),
  ),
  StatusBadge: jest.fn().mockImplementation(({className, emphasis, size}) =>
    createElement('span', {
      className,
      'data-emphasis': emphasis,
      'data-size': size,
      'data-testid': 'q-status-badge',
    }),
  ),
}));

jest.mock('@qualcomm-ui/react/segmented-control', () => ({
  SegmentedControl: {
    Item: jest
      .fn()
      .mockImplementation(({text, value}) =>
        createElement(
          'button',
          {'data-testid': 'seg-item', 'data-value': value},
          text,
        ),
      ),
    Root: jest
      .fn()
      .mockImplementation(
        ({
          children,
          multiple: _multiple,
          onValueChange: _onValueChange,
          value: _value,
        }) =>
          createElement('div', {'data-testid': 'segmented-control'}, children),
      ),
  },
}));

jest.mock('@qualcomm-ui/core/table', () => ({
  createColumnHelper: jest.fn().mockReturnValue({
    accessor: jest.fn().mockImplementation((key, opts) => ({
      accessorKey: key,
      ...opts,
    })),
  }),
  getCoreRowModel: jest.fn().mockReturnValue(() => ({})),
}));

jest.mock('@qualcomm-ui/react/table', () => ({
  flexRender: jest.fn().mockImplementation((fn, ctx) => {
    if (typeof fn === 'function') {
      return fn(ctx);
    }
    return fn;
  }),
  Table: {
    Body: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('tbody', {'data-testid': 'table-body'}, children),
      ),
    Cell: jest
      .fn()
      .mockImplementation(({children, style}) =>
        createElement('td', {style}, children),
      ),
    Header: jest
      .fn()
      .mockImplementation(({children}) => createElement('thead', {}, children)),
    HeaderCell: jest
      .fn()
      .mockImplementation(({children, style}) =>
        createElement('th', {style}, children),
      ),
    Root: jest
      .fn()
      .mockImplementation(({children}) =>
        createElement('div', {'data-testid': 'q-table'}, children),
      ),
    Row: jest
      .fn()
      .mockImplementation(({children}) => createElement('tr', {}, children)),
    ScrollContainer: jest
      .fn()
      .mockImplementation(({children, className}) =>
        createElement('div', {className}, children),
      ),
    Table: jest
      .fn()
      .mockImplementation(({children}) => createElement('table', {}, children)),
  },
  useReactTable: jest.fn().mockReturnValue({
    getHeaderGroups: jest.fn().mockReturnValue([]),
    getRowModel: jest.fn().mockReturnValue({rows: []}),
  }),
}));
