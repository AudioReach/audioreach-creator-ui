/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  AnyElementDto,
  BitFieldDto,
  ConfigElementDto,
  ElementTemplateArrayDto,
  NameValuePairDto,
  StructDto,
} from '~entities/spf-module-data';
import {
  renderElement,
  type RenderElementContext,
} from '~features/generic-tree-view/ui/components/render-element';

jest.mock('~shared/lib/logger');

// Minimal Tree context mock — QUI Tree components need a collection context.
// We bypass this by testing through a thin wrapper that provides it, or by
// testing the logic functions directly via the exported utilities.

// ── Helper: build a minimal RenderElementContext ────────────────────────────

function makeCtx(
  overrides: Partial<RenderElementContext> = {},
): RenderElementContext {
  return {
    arrayCounts: new Map(),
    committedValues: new Map(),
    dirtyPaths: new Set(),
    elementValues: new Map(),
    invalidPaths: new Set(),
    onValueChange: jest.fn(),
    parameterId: 'pid1',
    paramReadOnly: false,
    pathPrefix: [],
    policyFilter: new Set(['BASIC', 'ADVANCED']),
    setPaths: new Set(),
    showRanges: false,
    ...overrides,
  };
}

// ── Helper: build a simple ConfigElementDto ─────────────────────────────────

function makeConfig(
  overrides: Partial<ConfigElementDto> = {},
): ConfigElementDto {
  return {
    isReadOnly: false,
    name: 'elem',
    type: 'CONFIG_ELEMENT',
    value: '0x00000000',
    ...overrides,
  };
}

// ── Policy filter — HIDDEN elements not rendered ──────────────────────────────

describe('renderElement policy filter', () => {
  // We test policy filtering by checking that renderElement returns null for
  // HIDDEN elements. Since renderElement calls React.createContext internally,
  // we verify null return without mounting.

  it('returns null for HIDDEN policy element', () => {
    const elem: AnyElementDto = makeConfig({policy: 'HIDDEN'});
    const ctx = makeCtx();
    const result = renderElement(elem, ctx, [0]);
    expect(result).toBeNull();
  });

  it('returns null for BASIC element when policyFilter excludes BASIC', () => {
    const elem: AnyElementDto = makeConfig({policy: 'BASIC'});
    const ctx = makeCtx({policyFilter: new Set(['ADVANCED'])});
    const result = renderElement(elem, ctx, [0]);
    expect(result).toBeNull();
  });

  it('returns null for ADVANCED element when policyFilter excludes ADVANCED', () => {
    const elem: AnyElementDto = makeConfig({policy: 'ADVANCED'});
    const ctx = makeCtx({policyFilter: new Set(['BASIC'])});
    const result = renderElement(elem, ctx, [0]);
    expect(result).toBeNull();
  });

  it('does not return null for BASIC element when BASIC is in policyFilter', () => {
    const elem: AnyElementDto = makeConfig({policy: 'BASIC'});
    const ctx = makeCtx({policyFilter: new Set(['BASIC'])});
    const result = renderElement(elem, ctx, [0]);
    expect(result).not.toBeNull();
  });
});

// ── renderStruct ──────────────────────────────────────────────────────────────

describe('renderElement renderStruct', () => {
  it('renders child CONFIG_ELEMENT names for a STRUCT element', () => {
    const struct: StructDto = {
      isReadOnly: false,
      name: 'myStruct',
      structType: 'struct',
      type: 'STRUCT',
      value: [
        makeConfig({name: 'childA', value: '0x00000001'}),
        makeConfig({name: 'childB', value: '0x00000002'}),
      ],
    };
    const ctx = makeCtx({
      elementValues: new Map([
        ['pid1/myStruct/childA', '0x00000001'],
        ['pid1/myStruct/childB', '0x00000002'],
      ]),
    });
    const {container} = render(<>{renderElement(struct, ctx, [0])}</>);
    expect(container).toHaveTextContent('childA');
    expect(container).toHaveTextContent('childB');
  });
});

// ── renderArray (table mode) ──────────────────────────────────────────────────

describe('renderElement renderArray table mode', () => {
  it('renders a TableComponent for a fixed-length array', () => {
    const arr: ElementTemplateArrayDto = {
      isReadOnly: false,
      length: 2,
      name: 'myArr',
      template: [],
      type: 'ELEMENT_TEMPLATE_ARRAY',
      value: [
        makeConfig({name: 'myArr[0]', value: '0x00000001'}),
        makeConfig({name: 'myArr[1]', value: '0x00000002'}),
      ],
    };
    const ctx = makeCtx({
      elementValues: new Map([
        ['pid1/myArr[0]', '0x00000001'],
        ['pid1/myArr[1]', '0x00000002'],
      ]),
    });
    render(<>{renderElement(arr, ctx, [0])}</>);
    expect(screen.getByTestId('q-table')).toBeInTheDocument();
  });
});

// ── renderLeaf controls ───────────────────────────────────────────────────────

describe('renderElement renderLeaf controls', () => {
  it('TEXT_BOX renders a TextInput with the element value', () => {
    const elem = makeConfig({
      displayType: 'TEXT_BOX',
      name: 'txt',
      value: '0xAB',
    });
    const ctx = makeCtx({elementValues: new Map([['pid1/txt', '0xAB']])});
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.getAllByTestId('text-input').length).toBeGreaterThan(0);
  });

  it('DROP_DOWN with NAME_VALUE_PAIR options renders a Select', () => {
    const opts: NameValuePairDto[] = [
      {name: 'Alpha', type: 'NAME_VALUE_PAIR', value: '0x0'},
      {name: 'Beta', type: 'NAME_VALUE_PAIR', value: '0x1'},
      {name: 'Gamma', type: 'NAME_VALUE_PAIR', value: '0x2'},
    ];
    const elem = makeConfig({
      allowedValues: opts,
      displayType: 'DROP_DOWN',
      name: 'sel',
      value: '0x0',
    });
    const ctx = makeCtx({elementValues: new Map([['pid1/sel', '0x0']])});
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.getByTestId('q-select')).toBeInTheDocument();
  });

  it('boolean Enable/Disable pair renders a Switch', () => {
    const avs: NameValuePairDto[] = [
      {name: 'Enable', type: 'NAME_VALUE_PAIR', value: '0x1'},
      {name: 'Disable', type: 'NAME_VALUE_PAIR', value: '0x0'},
    ];
    const elem = makeConfig({allowedValues: avs, name: 'sw', value: '0x1'});
    const ctx = makeCtx({elementValues: new Map([['pid1/sw', '0x1']])});
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.getByTestId('q-switch')).toBeInTheDocument();
  });

  it('Q_FORMATTED_VALUE renders two TextInputs (hex + dec)', () => {
    const elem = makeConfig({
      displayType: 'Q_FORMATTED_VALUE',
      name: 'qfmt',
      qFormat: 'Q15',
      value: '0x00008000',
    });
    const ctx = makeCtx({
      elementValues: new Map([['pid1/qfmt', '0x00008000']]),
    });
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.getAllByTestId('text-input').length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('FILE displayType renders a read-only TextArea', () => {
    const elem = makeConfig({
      displayType: 'FILE',
      name: 'fileElem',
      value: 'some blob content',
    });
    const ctx = makeCtx({
      elementValues: new Map([['pid1/fileElem', 'some blob content']]),
    });
    render(<>{renderElement(elem, ctx, [0])}</>);
    const ta = screen.getByTestId('q-text-area');
    expect(ta).toBeInTheDocument();
    expect(ta).toHaveAttribute('readonly');
  });

  it('BIT_FIELD allowedValues renders a Select per bitfield', () => {
    const bfs: BitFieldDto[] = [
      {
        allowedValues: [
          {name: 'Off', type: 'NAME_VALUE_PAIR', value: '0x0'},
          {name: 'On', type: 'NAME_VALUE_PAIR', value: '0x1'},
        ],
        bitMask: '0x01',
        name: 'bit0',
        type: 'BIT_FIELD',
      },
    ];
    const elem = makeConfig({
      allowedValues: bfs,
      displayType: 'BIT_FIELD',
      name: 'bf',
      value: '0x00000000',
    });
    const ctx = makeCtx({elementValues: new Map([['pid1/bf', '0x00000000']])});
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.getByTestId('q-select')).toBeInTheDocument();
  });
});

// ── matchElementKeys filtering ────────────────────────────────────────────────

describe('renderElement matchElementKeys filtering', () => {
  it('returns null when element key is not in matchElementKeys', () => {
    const elem = makeConfig({name: 'hidden'});
    const ctx = makeCtx({matchElementKeys: new Set(['pid1/other'])});
    const result = renderElement(elem, ctx, [0]);
    expect(result).toBeNull();
  });

  it('renders when element key is in matchElementKeys', () => {
    const elem = makeConfig({name: 'visible'});
    const ctx = makeCtx({matchElementKeys: new Set(['pid1/visible'])});
    const result = renderElement(elem, ctx, [0]);
    expect(result).not.toBeNull();
  });
});

// ── range display ─────────────────────────────────────────────────────────────

describe('renderElement range display', () => {
  it('shows inline range hint when showRanges is true and min/max are defined', () => {
    const elem = makeConfig({
      max: 255,
      min: 0,
      name: 'rangeElem',
      value: '0x0',
    });
    const ctx = makeCtx({
      elementValues: new Map([['pid1/rangeElem', '0x0']]),
      showRanges: true,
    });
    const {container} = render(<>{renderElement(elem, ctx, [0])}</>);
    // The inline hint has class text-neutral-secondary (distinct from tooltip)
    const inlineHint = container.querySelector('.text-neutral-secondary');
    expect(inlineHint).toBeInTheDocument();
    expect(inlineHint).toHaveTextContent(/Range:/);
  });

  it('does not show inline range hint when showRanges is false', () => {
    const elem = makeConfig({
      max: 255,
      min: 0,
      name: 'rangeElem',
      value: '0x0',
    });
    const ctx = makeCtx({
      elementValues: new Map([['pid1/rangeElem', '0x0']]),
      showRanges: false,
    });
    const {container} = render(<>{renderElement(elem, ctx, [0])}</>);
    expect(container.querySelector('.text-neutral-secondary')).toBeNull();
  });
});

// ── invalid path error message ────────────────────────────────────────────────

describe('renderElement invalid path error', () => {
  it('shows validation error for an invalid path', () => {
    const elem = makeConfig({max: 10, min: 0, name: 'num', value: '0xFF'});
    const ctx = makeCtx({
      elementValues: new Map([['pid1/num', '0xFF']]),
      invalidPaths: new Set(['pid1/num']),
    });
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.getByText(/Must be between/)).toBeInTheDocument();
  });

  it('does not show validation error when path is not invalid', () => {
    const elem = makeConfig({max: 10, min: 0, name: 'num', value: '0x5'});
    const ctx = makeCtx({elementValues: new Map([['pid1/num', '0x5']])});
    render(<>{renderElement(elem, ctx, [0])}</>);
    expect(screen.queryByText(/Must be between/)).toBeNull();
  });
});

// ── dirty / set indicators ────────────────────────────────────────────────────

describe('renderElement dirty/set indicators', () => {
  it('dirty element gets dirty-pulse class on the leaf node', () => {
    const elem = makeConfig({name: 'dp'});
    const ctx = makeCtx({
      dirtyPaths: new Set(['pid1/dp']),
      elementValues: new Map([['pid1/dp', '0x1']]),
    });
    const {container} = render(<>{renderElement(elem, ctx, [0])}</>);
    const bar = container.querySelector('.bg-support-warning');
    expect(bar).toBeInTheDocument();
  });

  it('set element gets success color on the indicator bar', () => {
    const elem = makeConfig({name: 'sp'});
    const ctx = makeCtx({
      elementValues: new Map([['pid1/sp', '0x1']]),
      setPaths: new Set(['pid1/sp']),
    });
    const {container} = render(<>{renderElement(elem, ctx, [0])}</>);
    const bar = container.querySelector('.bg-support-success');
    expect(bar).toBeInTheDocument();
  });
});

// ── Switch control interaction ────────────────────────────────────────────────

describe('renderElement SwitchControl interaction', () => {
  it('calls onValueChange with the on-value when switch is toggled on', async () => {
    const onValueChange = jest.fn();
    const avs: NameValuePairDto[] = [
      {name: 'Enable', type: 'NAME_VALUE_PAIR', value: '0x1'},
      {name: 'Disable', type: 'NAME_VALUE_PAIR', value: '0x0'},
    ];
    const elem = makeConfig({allowedValues: avs, name: 'sw', value: '0x0'});
    const ctx = makeCtx({
      elementValues: new Map([['pid1/sw', '0x0']]),
      onValueChange,
    });
    render(<>{renderElement(elem, ctx, [0])}</>);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onValueChange).toHaveBeenCalledWith('pid1/sw', '0x1');
  });
});

// ── Debounce cleanup on unmount ──────────────────────────────────────────────

describe('renderElement debounce cleanup on unmount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('HexInputControl does not fire onValueChange after unmount mid-debounce', () => {
    const onValueChange = jest.fn();
    const elem = makeConfig({name: 'hexElem', value: '0xAB'});
    const ctx = makeCtx({
      elementValues: new Map([['pid1/hexElem', '0xAB']]),
      onValueChange,
    });
    const {unmount} = render(<>{renderElement(elem, ctx, [0])}</>);

    const input = screen.getByTestId('text-input');
    fireEvent.change(input, {target: {value: '0xCD'}});

    unmount();
    jest.advanceTimersByTime(200);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('QFormatControl does not fire onValueChange after unmount mid-debounce', () => {
    const onValueChange = jest.fn();
    const elem = makeConfig({
      displayType: 'Q_FORMATTED_VALUE',
      name: 'qfmt',
      qFormat: 'Q15',
      value: '0x00008000',
    });
    const ctx = makeCtx({
      elementValues: new Map([['pid1/qfmt', '0x00008000']]),
      onValueChange,
    });
    const {unmount} = render(<>{renderElement(elem, ctx, [0])}</>);

    const [hexInput] = screen.getAllByTestId('text-input');
    fireEvent.change(hexInput, {target: {value: '0x00001000'}});

    unmount();
    jest.advanceTimersByTime(200);

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
