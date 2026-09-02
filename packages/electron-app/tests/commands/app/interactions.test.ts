/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test, type Locator} from '@playwright/test';

import {
  check,
  clear,
  click,
  doubleClick,
  dragAndDrop,
  fileChooser,
  fill,
  focus,
  getAttribute,
  getText,
  hover,
  isChecked,
  isEnabled,
  isSelected,
  press,
  radio,
  select,
  selectCustom,
  uncheck,
  wait,
} from './interactions';
import type {TestContext} from '../../framework/test-context';

type Calls = {
  readonly calls: string[];
  readonly locator: (context: TestContext) => Locator;
  readonly page: TestContext['page'];
};

function createCalls(): Calls {
  const calls: string[] = [];
  const locator = () => {
    const target = {
      check: () => Promise.resolve(calls.push('check')),
      click: () => Promise.resolve(calls.push('click')),
      dblclick: () => Promise.resolve(calls.push('double-click')),
      describe: (description: string) => {
        calls.push(`describe:${description}`);
        return target;
      },
      dragTo: () => Promise.resolve(calls.push('drag-to')),
      fill: (value: string) => Promise.resolve(calls.push(`fill:${value}`)),
      focus: () => Promise.resolve(calls.push('focus')),
      getAttribute: (name: string) =>
        Promise.resolve(calls.push(`attribute:${name}`) && 'value'),
      hover: () => Promise.resolve(calls.push('hover')),
      innerText: () => Promise.resolve(calls.push('text') && 'visible text'),
      isChecked: () => Promise.resolve(calls.push('checked') && true),
      isEnabled: () => Promise.resolve(calls.push('enabled') && true),
      isSelected: () => Promise.resolve(calls.push('selected') && true),
      press: (key: string) => Promise.resolve(calls.push(`press:${key}`)),
      selectOption: (value: string) =>
        Promise.resolve(calls.push(`select:${value}`)),
      uncheck: () => Promise.resolve(calls.push('uncheck')),
      waitFor: (options: {readonly state: string}) =>
        Promise.resolve(calls.push(`wait:${options.state}`)),
    };

    return target as unknown as Locator;
  };
  const page = {
    waitForEvent: () =>
      Promise.resolve({
        setFiles: (files: string[]) =>
          Promise.resolve(calls.push(`files:${files.join(',')}`)),
      }),
  } as unknown as TestContext['page'];

  return {calls, locator, page};
}

test('interaction commands use stable IDs, descriptions, and operations', async () => {
  const {calls, locator, page} = createCalls();
  const target = {target: locator, targetDescription: 'control'};
  const option = {target: locator, targetDescription: 'option'};
  const context = {page} as TestContext;

  await click(target).execute(context);
  await doubleClick(target).execute(context);
  await fill({...target, value: 'value'}).execute(context);
  await clear(target).execute(context);
  await press({...target, key: 'Enter'}).execute(context);
  await check(target).execute(context);
  await uncheck(target).execute(context);
  await select({...target, value: 'one'}).execute(context);
  await selectCustom({option, target}).execute(context);
  await radio(target).execute(context);
  await hover(target).execute(context);
  await focus(target).execute(context);
  await expect(isEnabled(target).execute(context)).resolves.toBe(true);
  await expect(isSelected(target).execute(context)).resolves.toBe(true);
  await expect(isChecked(target).execute(context)).resolves.toBe(true);
  await expect(
    getAttribute({...target, name: 'aria-label'}).execute(context),
  ).resolves.toBe('value');
  await expect(getText(target).execute(context)).resolves.toBe('visible text');
  await wait({...target, state: 'visible'}).execute(context);
  await fileChooser({...target, files: ['workspace.arc']}).execute(context);
  await dragAndDrop({source: target, target: option}).execute(context);

  expect(calls).toEqual([
    'describe:control',
    'click',
    'describe:control',
    'double-click',
    'describe:control',
    'fill:value',
    'describe:control',
    'fill:',
    'describe:control',
    'press:Enter',
    'describe:control',
    'check',
    'describe:control',
    'uncheck',
    'describe:control',
    'select:one',
    'describe:control',
    'click',
    'describe:option',
    'click',
    'describe:control',
    'check',
    'describe:control',
    'hover',
    'describe:control',
    'focus',
    'describe:control',
    'enabled',
    'describe:control',
    'selected',
    'describe:control',
    'checked',
    'describe:control',
    'attribute:aria-label',
    'describe:control',
    'text',
    'describe:control',
    'wait:visible',
    'describe:control',
    'click',
    'files:workspace.arc',
    'describe:control',
    'describe:option',
    'drag-to',
  ]);

  expect([
    click(target),
    doubleClick(target),
    fill({...target, value: 'value'}),
    clear(target),
    press({...target, key: 'Enter'}),
    check(target),
    uncheck(target),
    select({...target, value: 'one'}),
    selectCustom({option, target}),
    radio(target),
    hover(target),
    focus(target),
    wait({...target, state: 'visible'}),
    fileChooser({...target, files: ['workspace.arc']}),
    dragAndDrop({source: target, target: option}),
  ].map(({id}) => id)).toEqual([
    'app.click',
    'app.double-click',
    'app.fill',
    'app.clear',
    'app.press',
    'app.check',
    'app.uncheck',
    'app.select',
    'app.select-custom',
    'app.radio',
    'app.hover',
    'app.focus',
    'app.wait',
    'app.file-chooser',
    'app.drag-and-drop',
  ]);
});
