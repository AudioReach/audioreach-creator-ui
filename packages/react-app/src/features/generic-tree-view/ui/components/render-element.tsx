/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {TextArea} from '@qualcomm-ui/react/text-area';
import {Tooltip} from '@qualcomm-ui/react/tooltip';
import {Tree} from '@qualcomm-ui/react/tree';

import type {
  AnyElementDto,
  BitFieldDto,
  ConfigElementDto,
  ElementTemplateArrayDto,
  NameValuePairDto,
  StructDto,
} from '~entities/spf-module-data';

import {elementKey} from '../../lib/element-key';
import {isBitField} from '../../lib/is-bit-field';
import {isBooleanSwitch, resolveBooleanPair} from '../../lib/is-boolean-switch';
import {isPolicyVisible} from '../../lib/is-policy-visible';
import {parseQFormatN} from '../../lib/parse-q-format-n';
import {toHexString} from '../../lib/to-hex-string';

import {BitFieldRow} from './bit-field-row';
import {TableComponent} from './element-table';
import {HexInputControl} from './hex-input-control';
import {QFormatControl} from './q-format-control';
import {SelectControl} from './select-control';
import {SwitchControl} from './switch-control';

export interface RenderElementContext {
  arrayCounts: Map<string, number>;
  committedValues: Map<string, string>;
  dirtyPaths: Set<string>;
  elementValues: Map<string, string>;
  invalidPaths: Set<string>;
  matchElementKeys?: Set<string>;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
  parameterId: string;
  paramReadOnly: boolean;
  pathPrefix: string[];
  policyFilter: Set<'BASIC' | 'ADVANCED'>;
  setPaths: Set<string>;
  showRanges: boolean;
}

export function renderElement(
  elem: AnyElementDto,
  ctx: RenderElementContext,
  indexPath: number[],
): React.ReactNode {
  if (elem.type === 'STRUCT') {
    return renderStruct(elem, ctx, indexPath);
  }
  if (elem.type === 'ELEMENT_TEMPLATE_ARRAY') {
    return renderArray(elem, ctx, indexPath);
  }
  return renderLeaf(elem, ctx, indexPath);
}

function renderStruct(
  elem: StructDto,
  ctx: RenderElementContext,
  indexPath: number[],
): React.ReactNode {
  const nodeId = elementKey(ctx.parameterId, ...ctx.pathPrefix, elem.name);
  const childCtx: RenderElementContext = {
    ...ctx,
    pathPrefix: [...ctx.pathPrefix, elem.name],
  };
  const childNodes = (elem.value ?? []).map((child, i) =>
    renderElement(child, childCtx, [...indexPath, i]),
  );

  return (
    <Tree.NodeProvider
      key={nodeId}
      indexPath={indexPath}
      node={{id: nodeId, name: elem.name}}
    >
      <Tree.Branch>
        <Tree.BranchNode>
          <Tree.NodeIndicator />
          <Tree.BranchTrigger />
          <Tree.NodeText>{elem.name}</Tree.NodeText>
        </Tree.BranchNode>
        <Tree.BranchContent>
          <Tree.BranchIndentGuide />
          {childNodes}
        </Tree.BranchContent>
      </Tree.Branch>
    </Tree.NodeProvider>
  );
}

function renderArray(
  elem: ElementTemplateArrayDto,
  ctx: RenderElementContext,
  indexPath: number[],
): React.ReactNode {
  const arrayPath = elementKey(ctx.parameterId, ...ctx.pathPrefix, elem.name);

  if (elem.length !== undefined && !elem.lengthFormula) {
    const tableKey = arrayPath;
    const rows = (elem.value as ConfigElementDto[]).map((inst, i) => ({
      index: i,
      value:
        ctx.elementValues.get(
          elementKey(ctx.parameterId, ...ctx.pathPrefix, inst.name),
        ) ?? inst.value,
    }));
    const originalRows = (elem.value as ConfigElementDto[]).map((inst, i) => ({
      index: i,
      value:
        ctx.committedValues.get(
          elementKey(ctx.parameterId, ...ctx.pathPrefix, inst.name),
        ) ?? inst.value,
    }));
    const isTableDirty = rows.some((r, i) => r.value !== originalRows[i].value);
    const barColor = isTableDirty
      ? 'var(--color-background-support-warning)'
      : 'transparent';

    return (
      <Tree.NodeProvider
        key={elem.name}
        indexPath={indexPath}
        node={{id: tableKey, name: elem.name}}
      >
        <Tree.LeafNode className="h-auto min-h-0 items-start">
          <Tree.NodeIndicator />
          <span
            style={{
              alignSelf: 'stretch',
              backgroundColor: barColor,
              borderRadius: '2px',
              flexShrink: 0,
              width: '4px',
            }}
          />
          <div className="flex items-center gap-4 py-2">
            <Tree.NodeText className="wrap-break-word w-60 shrink-0">
              {elem.name}
            </Tree.NodeText>
            <div className="shrink-0">
              <TableComponent
                data={rows}
                disabled={ctx.paramReadOnly}
                onCellChange={(rowIndex, value) => {
                  const inst = (elem.value as ConfigElementDto[])[rowIndex];
                  const instKey = elementKey(
                    ctx.parameterId,
                    ...ctx.pathPrefix,
                    inst.name,
                  );
                  ctx.onValueChange(instKey, value);
                }}
              />
            </div>
          </div>
        </Tree.LeafNode>
      </Tree.NodeProvider>
    );
  }

  const count = ctx.arrayCounts.get(arrayPath) ?? elem.value.length;

  const instances: AnyElementDto[] = [];
  for (let i = 0; i < count; i++) {
    if (i < elem.value.length) {
      instances.push(elem.value[i]);
    } else {
      const templateClone = elem.template[0];
      if (templateClone) {
        const cloned: AnyElementDto = {
          ...templateClone,
          name: `${elem.name}[${i}]`,
        };
        instances.push(cloned);
      }
    }
  }

  const instanceNodes = instances.map((inst, i) => {
    const instName = inst.type === 'STRUCT' ? inst.name : `${elem.name}[${i}]`;
    const childCtx: RenderElementContext = {
      ...ctx,
      pathPrefix: [...ctx.pathPrefix, instName],
    };
    return renderElement(inst, childCtx, [...indexPath, i]);
  });

  const instanceCountLabel = `${elem.name} (${count} ${count === 1 ? 'instance' : 'instances'})`;

  return (
    <Tree.NodeProvider
      key={elem.name}
      indexPath={indexPath}
      node={{id: arrayPath, name: elem.name}}
    >
      <Tree.Branch>
        <Tree.BranchNode>
          <Tree.NodeIndicator />
          <Tree.BranchTrigger />
          <Tree.NodeText>{instanceCountLabel}</Tree.NodeText>
        </Tree.BranchNode>
        <Tree.BranchContent>
          <Tree.BranchIndentGuide />
          {instanceNodes}
        </Tree.BranchContent>
      </Tree.Branch>
    </Tree.NodeProvider>
  );
}

function renderLeaf(
  elem: ConfigElementDto,
  ctx: RenderElementContext,
  indexPath: number[],
): React.ReactNode {
  if (!isPolicyVisible(elem.policy, ctx.policyFilter)) {
    return null;
  }

  const key = elementKey(ctx.parameterId, ...ctx.pathPrefix, elem.name);

  if (ctx.matchElementKeys && !ctx.matchElementKeys.has(key)) {
    return null;
  }

  const isDirty = ctx.dirtyPaths.has(key);
  const isSet = ctx.setPaths.has(key);
  const barColor = isSet
    ? 'var(--color-background-support-success)'
    : isDirty
      ? 'var(--color-background-support-warning)'
      : 'transparent';

  const dirtyBar = (
    <span
      style={{
        alignSelf: 'stretch',
        backgroundColor: barColor,
        borderRadius: '2px',
        flexShrink: 0,
        width: '4px',
      }}
    />
  );

  const hasRange = elem.min !== undefined && elem.max !== undefined;
  const tooltipLines: string[] = [];
  if (elem.description) {
    tooltipLines.push(elem.description);
  }
  if (hasRange) {
    tooltipLines.push(
      `Range: ${toHexString(elem.min!)} – ${toHexString(elem.max!)}`,
    );
  }

  const labelEl = (
    <Tree.NodeText className="wrap-break-word w-60 shrink-0">
      {elem.name}
    </Tree.NodeText>
  );

  const labelWithTooltip =
    tooltipLines.length > 0 ? (
      <Tooltip.Root positioning={{placement: 'top'}}>
        <Tooltip.Trigger>{labelEl}</Tooltip.Trigger>
        <Tooltip.Positioner style={{zIndex: 50}}>
          <Tooltip.Content>
            <Tooltip.Arrow>
              <Tooltip.ArrowTip />
            </Tooltip.Arrow>
            <div className="whitespace-pre-line text-xs">
              {tooltipLines.join('\n')}
            </div>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    ) : (
      labelEl
    );

  const isFile = elem.displayType === 'FILE' || elem.displayType === 'DUMP';
  const isBitFieldElem =
    elem.displayType === 'BIT_FIELD' &&
    elem.allowedValues &&
    isBitField(elem.allowedValues);
  const currentValue = ctx.elementValues.get(key) ?? elem.value;
  const disabled = ctx.paramReadOnly || elem.isReadOnly;

  if (isBitFieldElem) {
    const bitFields = elem.allowedValues as BitFieldDto[];
    return (
      <Tree.NodeProvider
        key={key}
        indexPath={indexPath}
        node={{id: key, name: elem.name}}
      >
        <Tree.Branch>
          <Tree.BranchNode>
            <Tree.NodeIndicator />
            <Tree.BranchTrigger />
            {dirtyBar}
            <div className="flex items-center gap-4">
              <Tree.NodeText className="wrap-break-word w-60 shrink-0">
                {elem.name}
              </Tree.NodeText>
              <span className="font-mono text-sm">{currentValue}</span>
            </div>
          </Tree.BranchNode>
          <Tree.BranchContent>
            <Tree.BranchIndentGuide />
            {bitFields.map((bf, bi) => (
              <BitFieldRow
                key={bf.bitMask}
                bf={bf}
                ctx={ctx}
                disabled={disabled}
                indexPath={[...indexPath, bi]}
                parentKey={key}
                parentValue={currentValue}
              />
            ))}
          </Tree.BranchContent>
        </Tree.Branch>
      </Tree.NodeProvider>
    );
  }

  const isInvalid = ctx.invalidPaths.has(key);
  const control = renderControl(elem, key, currentValue, disabled, ctx);

  const rangeHintText =
    ctx.showRanges && hasRange
      ? `Range: ${toHexString(elem.min!)} – ${toHexString(elem.max!)}`
      : null;

  if (isFile) {
    return (
      <Tree.NodeProvider
        key={key}
        indexPath={indexPath}
        node={{id: key, name: elem.name}}
      >
        <Tree.LeafNode className="h-auto min-h-0 items-start">
          <Tree.NodeIndicator />
          {dirtyBar}
          <div className="flex w-full min-w-0 flex-col gap-1 py-1">
            {labelWithTooltip}
            <div className="w-full">{control}</div>
          </div>
        </Tree.LeafNode>
      </Tree.NodeProvider>
    );
  }

  return (
    <Tree.NodeProvider
      key={key}
      indexPath={indexPath}
      node={{id: key, name: elem.name}}
    >
      <Tree.LeafNode
        className={
          rangeHintText || isInvalid
            ? 'h-auto min-h-0 items-start py-1'
            : undefined
        }
      >
        <Tree.NodeIndicator />
        {dirtyBar}
        <div className="flex flex-col gap-0.5 py-0.5">
          <div className="flex items-center gap-4">
            {labelWithTooltip}
            <div className="shrink-0">{control}</div>
          </div>
          {rangeHintText && (
            <div className="text-neutral-secondary pl-64 text-xs">
              {rangeHintText}
            </div>
          )}
          {isInvalid && elem.min !== undefined && elem.max !== undefined && (
            <span
              className="pl-64 text-xs"
              style={{color: 'var(--color-text-support-danger)'}}
            >
              {`Must be between ${toHexString(elem.min)} and ${toHexString(elem.max)}`}
            </span>
          )}
        </div>
      </Tree.LeafNode>
    </Tree.NodeProvider>
  );
}

function renderControl(
  elem: ConfigElementDto,
  key: string,
  currentValue: string,
  disabled: boolean,
  ctx: RenderElementContext,
): React.ReactNode {
  const {onValueChange} = ctx;

  if (elem.displayType === 'FILE' || elem.displayType === 'DUMP') {
    return (
      <TextArea
        defaultValue={currentValue}
        inputProps={{
          rows: 6,
          style: {fontFamily: 'monospace', resize: 'vertical'},
        }}
        readOnly
        size="sm"
      />
    );
  }

  if (elem.allowedValues && isBooleanSwitch(elem.allowedValues)) {
    const {off, on} = resolveBooleanPair(elem.allowedValues);
    return (
      <SwitchControl
        currentValue={currentValue}
        disabled={disabled}
        elementKey={key}
        offValue={off.value}
        onAutoCommit={ctx.onAutoCommit}
        onValue={on.value}
        onValueChange={onValueChange}
      />
    );
  }

  if (
    elem.allowedValues &&
    elem.allowedValues.length > 0 &&
    elem.allowedValues[0].type === 'NAME_VALUE_PAIR'
  ) {
    const options = elem.allowedValues as NameValuePairDto[];
    return (
      <SelectControl
        currentValue={currentValue}
        disabled={disabled}
        elementKey={key}
        onAutoCommit={ctx.onAutoCommit}
        onValueChange={onValueChange}
        options={options}
      />
    );
  }

  if (
    (elem.displayType === 'Q_FORMATTED_VALUE' || elem.qFormat) &&
    elem.displayType !== 'DROP_DOWN'
  ) {
    const n = parseQFormatN(elem.qFormat ?? 'Q15');
    return (
      <QFormatControl
        currentValue={currentValue}
        disabled={disabled}
        elementKey={key}
        onAutoCommit={ctx.onAutoCommit}
        onValueChange={onValueChange}
        qFormatN={n}
      />
    );
  }

  return (
    <HexInputControl
      currentValue={currentValue}
      disabled={disabled}
      elementKey={key}
      onAutoCommit={ctx.onAutoCommit}
      onValueChange={onValueChange}
    />
  );
}
