/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Locator, WaitForSelectorState} from '@playwright/test';

import type {CommandFactory} from '../../framework/command';
import type {TestContext} from '../../framework/test-context';

export type InteractionTarget = (context: TestContext) => Locator;

export type InteractionTargetInput = {
  readonly target: InteractionTarget;
  readonly targetDescription: string;
};

type ValueInput = InteractionTargetInput & {readonly value: string};
type KeyInput = InteractionTargetInput & {readonly key: string};
type AttributeInput = InteractionTargetInput & {readonly name: string};
type WaitInput = InteractionTargetInput & {readonly state: WaitForSelectorState};
type CustomSelectInput = {
  readonly option: InteractionTargetInput;
  readonly target: InteractionTargetInput;
};
type FileChooserInput = InteractionTargetInput & {
  readonly files: string | string[];
};
type DragAndDropInput = {
  readonly source: InteractionTargetInput;
  readonly target: InteractionTargetInput;
};

function locate(
  context: TestContext,
  input: InteractionTargetInput,
): Locator {
  return input.target(context).describe(input.targetDescription);
}

export const click: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).click();
  },
  id: 'app.click',
  metadata: {target: input.targetDescription},
});

export const doubleClick: CommandFactory<InteractionTargetInput, void> = (
  input,
) => ({
  execute: async (context) => {
    await locate(context, input).dblclick();
  },
  id: 'app.double-click',
  metadata: {target: input.targetDescription},
});

export const fill: CommandFactory<ValueInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).fill(input.value);
  },
  id: 'app.fill',
  metadata: {target: input.targetDescription},
});

export const clear: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).fill('');
  },
  id: 'app.clear',
  metadata: {target: input.targetDescription},
});

export const press: CommandFactory<KeyInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).press(input.key);
  },
  id: 'app.press',
  metadata: {target: input.targetDescription},
});

export const check: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).check();
  },
  id: 'app.check',
  metadata: {target: input.targetDescription},
});

export const uncheck: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).uncheck();
  },
  id: 'app.uncheck',
  metadata: {target: input.targetDescription},
});

export const select: CommandFactory<ValueInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).selectOption(input.value);
  },
  id: 'app.select',
  metadata: {target: input.targetDescription},
});

export const selectCustom: CommandFactory<CustomSelectInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input.target).click();
    await locate(context, input.option).click();
  },
  id: 'app.select-custom',
  metadata: {
    option: input.option.targetDescription,
    target: input.target.targetDescription,
  },
});

export const radio: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).check();
  },
  id: 'app.radio',
  metadata: {target: input.targetDescription},
});

export const hover: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).hover();
  },
  id: 'app.hover',
  metadata: {target: input.targetDescription},
});

export const focus: CommandFactory<InteractionTargetInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).focus();
  },
  id: 'app.focus',
  metadata: {target: input.targetDescription},
});

export const isEnabled: CommandFactory<InteractionTargetInput, boolean> = (
  input,
) => ({
  execute: (context) => locate(context, input).isEnabled(),
  id: 'app.is-enabled',
  metadata: {target: input.targetDescription},
});

export const isSelected: CommandFactory<InteractionTargetInput, boolean> = (
  input,
) => ({
  execute: (context) => locate(context, input).isSelected(),
  id: 'app.is-selected',
  metadata: {target: input.targetDescription},
});

export const isChecked: CommandFactory<InteractionTargetInput, boolean> = (
  input,
) => ({
  execute: (context) => locate(context, input).isChecked(),
  id: 'app.is-checked',
  metadata: {target: input.targetDescription},
});

export const getAttribute: CommandFactory<AttributeInput, string | null> = (
  input,
) => ({
  execute: (context) => locate(context, input).getAttribute(input.name),
  id: 'app.get-attribute',
  metadata: {target: input.targetDescription},
});

export const getText: CommandFactory<InteractionTargetInput, string> = (input) => ({
  execute: (context) => locate(context, input).innerText(),
  id: 'app.get-text',
  metadata: {target: input.targetDescription},
});

export const wait: CommandFactory<WaitInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input).waitFor({state: input.state});
  },
  id: 'app.wait',
});

export const fileChooser: CommandFactory<FileChooserInput, void> = (input) => ({
  execute: async (context) => {
    const chooser = context.page.waitForEvent('filechooser');
    await locate(context, input).click();
    await (await chooser).setFiles(input.files);
  },
  id: 'app.file-chooser',
});

export const dragAndDrop: CommandFactory<DragAndDropInput, void> = (input) => ({
  execute: async (context) => {
    await locate(context, input.source).dragTo(locate(context, input.target));
  },
  id: 'app.drag-and-drop',
});
