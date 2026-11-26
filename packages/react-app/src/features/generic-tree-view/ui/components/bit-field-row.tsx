/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {selectCollection} from '@qualcomm-ui/core/select';
import {Select} from '@qualcomm-ui/react/select';
import {Tree} from '@qualcomm-ui/react/tree';

import type {BitFieldDto} from '~entities/spf-module-data';

import {computeBitfieldParentValue} from '../../lib/compute-bitfield-parent-value';
import {findOptionName} from '../../lib/find-option-name';
import {parseHexOrDec} from '../../lib/parse-hex-or-dec';

import type {RenderElementContext} from './render-element';

export interface BitFieldRowProps {
  bf: BitFieldDto;
  ctx: RenderElementContext;
  disabled: boolean;
  indexPath: number[];
  parentKey: string;
  parentValue: string;
}

export function BitFieldRow({
  bf,
  ctx,
  disabled,
  indexPath,
  parentKey,
  parentValue,
}: BitFieldRowProps) {
  const bfKey = `${parentKey}/${bf.bitMask}`;
  const currentParentHex = ctx.elementValues.get(parentKey) ?? parentValue;

  const maskNum = parseHexOrDec(bf.bitMask);
  const parentNum = parseHexOrDec(currentParentHex);
  const shift = maskNum === 0 ? 0 : Math.clz32(maskNum ^ (maskNum - 1)) ^ 31;
  const currentBfNum = maskNum > 0 ? (parentNum & maskNum) >> shift : 0;
  const currentBfValueHex = `0x${currentBfNum.toString(16).toUpperCase().padStart(8, '0')}`;

  const names = bf.rangeList.map((av) => av.name);
  const collection = selectCollection({items: names});
  const selectedName =
    findOptionName(bf.rangeList, currentBfValueHex) ||
    (bf.rangeList[0]?.name ?? '');
  const [selected, setSelected] = useState(selectedName);
  const longestName = names.reduce((a, b) => (a.length > b.length ? a : b), '');

  return (
    <Tree.NodeProvider
      indexPath={indexPath}
      node={{id: bfKey, name: bf.bitName}}
    >
      <Tree.LeafNode>
        <Tree.NodeIndicator />
        <div className="flex items-center gap-4">
          <Tree.NodeText className="w-60 shrink-0 wrap-break-word">
            {bf.bitName}
          </Tree.NodeText>
          <Select
            aria-label={bf.bitName}
            clearable={false}
            collection={collection}
            disabled={disabled}
            onValueChange={(details) => {
              const newName = details[0];
              if (!newName) {
                return;
              }
              setSelected(newName);
              const newOptionHex =
                bf.rangeList.find((av) => av.name === newName)?.value ?? '0x0';
              const newParentHex = computeBitfieldParentValue(
                [bf],
                bf.bitMask,
                newOptionHex,
                ctx.elementValues.get(parentKey) ?? parentValue,
              );
              ctx.onValueChange(bfKey, newOptionHex);
              ctx.onValueChange(parentKey, newParentHex);
            }}
            positionerProps={{className: 'min-w-max'}}
            size="sm"
            style={{minWidth: `calc(${longestName.length}ch + 3rem)`}}
            value={[selected]}
            valueTextProps={{className: 'whitespace-nowrap'}}
          />
        </div>
      </Tree.LeafNode>
    </Tree.NodeProvider>
  );
}
