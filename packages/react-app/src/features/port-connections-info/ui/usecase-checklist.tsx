/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';

import type {UsecaseDto} from '~entities/usecases';

export interface UsecaseChecklistProps {
  checkedUsecases: UsecaseDto[];
  onChange: (checked: UsecaseDto[]) => void;
  usecases: UsecaseDto[];
}

const usecaseLabel = (usecase: UsecaseDto): string =>
  usecase.usecaseAliasName ?? usecase.systemId;

export function UsecaseChecklist({
  checkedUsecases,
  onChange,
  usecases,
}: UsecaseChecklistProps) {
  if (usecases.length === 0) {
    return null;
  }

  const checkedIds = new Set(checkedUsecases.map((u) => u.systemId));

  const handleToggle = (usecase: UsecaseDto, checked: boolean): void => {
    onChange(
      checked
        ? [...checkedUsecases, usecase]
        : checkedUsecases.filter((u) => u.systemId !== usecase.systemId),
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border-neutral-02)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Usecases</span>
        <div className="flex items-center gap-2">
          <Button onClick={() => onChange(usecases)} size="sm" variant="ghost">
            Select all
          </Button>
          <Button onClick={() => onChange([])} size="sm" variant="ghost">
            Deselect all
          </Button>
        </div>
      </div>
      <div className="flex max-h-52 flex-col gap-2 overflow-y-auto">
        {usecases.map((usecase) => (
          <Checkbox
            key={usecase.systemId}
            checked={checkedIds.has(usecase.systemId)}
            label={usecaseLabel(usecase)}
            onCheckedChange={(checked) => handleToggle(usecase, checked)}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
