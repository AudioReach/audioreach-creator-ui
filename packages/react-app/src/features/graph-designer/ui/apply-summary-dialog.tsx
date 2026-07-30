/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {CirclePlus, type LucideIcon, Pencil, Trash2} from 'lucide-react';

import {Accordion} from '@qualcomm-ui/react/accordion';
import {Button} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';
import {Dialog} from '@qualcomm-ui/react/dialog';
import {Divider} from '@qualcomm-ui/react/divider';
import {Radio, RadioGroup} from '@qualcomm-ui/react/radio';

import type {
  CreateUsecasesResponseDto,
  UsecaseIdentifierWithChangeInfoDto,
} from '~entities/edit-session';

type NavChoice = 'add' | 'keep' | 'switch';

interface ApplySummaryDialogProps {
  onCancel: () => void;
  onOK: (checkedChangeIds: string[], navChoice: NavChoice) => void;
  open: boolean;
  response: CreateUsecasesResponseDto;
}

interface Category {
  icon: LucideIcon;
  key: string;
  rows: UsecaseIdentifierWithChangeInfoDto[];
  title: string;
}

function rowLabel(row: UsecaseIdentifierWithChangeInfoDto): string {
  return row.usecaseAliasName ?? `${row.usecaseType} usecase ${row.systemId}`;
}

function buildDefaultCheckedMap(
  rows: UsecaseIdentifierWithChangeInfoDto[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const row of rows) {
    map[row.changeId] = true;
  }
  return map;
}

function usecaseCountLabel(count: number): string {
  return `${count} use case${count === 1 ? '' : 's'}`;
}

const AUTO_EXPAND_ALL_THRESHOLD = 15;

function defaultExpandedKeys(categories: Category[]): string[] {
  const totalRows = categories.reduce(
    (sum, category) => sum + category.rows.length,
    0,
  );
  if (totalRows <= AUTO_EXPAND_ALL_THRESHOLD) {
    return categories.map((category) => category.key);
  }
  return categories.length > 0 ? [categories[0].key] : [];
}

function CategorySection({
  checkedByChangeId,
  onToggle,
  rows,
  title,
}: {
  checkedByChangeId: Record<string, boolean>;
  onToggle: (changeId: string, checked: boolean) => void;
  rows: UsecaseIdentifierWithChangeInfoDto[];
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <h3 className="text-sm font-semibold text-[color:var(--color-text-neutral-primary)]">
          {title}
        </h3>
      )}
      {rows.map((row) => (
        <Checkbox
          key={row.changeId}
          checked={checkedByChangeId[row.changeId]}
          label={rowLabel(row)}
          onCheckedChange={(checked) => onToggle(row.changeId, checked)}
          size="sm"
        />
      ))}
    </div>
  );
}

export function ApplySummaryDialog(props: ApplySummaryDialogProps) {
  const {onCancel, onOK, open, response} = props;
  const {created, deleted, updated} = response;

  const [checkedByChangeId, setCheckedByChangeId] = useState<
    Record<string, boolean>
  >(() => buildDefaultCheckedMap([...created, ...updated, ...deleted]));
  const [navChoice, setNavChoice] = useState<NavChoice>('keep');

  const toggleRow = (changeId: string, checked: boolean): void => {
    setCheckedByChangeId((prev) => ({...prev, [changeId]: checked}));
  };

  const handleOK = (): void => {
    const checkedChangeIds = Object.entries(checkedByChangeId)
      .filter(([, checked]) => checked)
      .map(([changeId]) => changeId);
    onOK(checkedChangeIds, navChoice);
  };

  const categories: Category[] = [
    {icon: CirclePlus, key: 'created', rows: created, title: 'Created'},
    {icon: Pencil, key: 'updated', rows: updated, title: 'Updated'},
    {icon: Trash2, key: 'deleted', rows: deleted, title: 'Deleted'},
  ].filter((category) => category.rows.length > 0);

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      emphasis="info"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
      open={open}
      placement="center"
      size="md"
    >
      <Dialog.FloatingPortal>
        <Dialog.Body>
          <Dialog.Heading>Summary</Dialog.Heading>
          <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-2">
            {categories.length > 1 ? (
              <Accordion.Root
                className="flex flex-col gap-2"
                defaultValue={defaultExpandedKeys(categories)}
                multiple
              >
                {categories.map((category) => (
                  <div
                    key={category.key}
                    className="overflow-hidden rounded-md border shadow-sm"
                  >
                    <Accordion.ItemRoot value={category.key}>
                      <Accordion.ItemTrigger icon={category.icon}>
                        <Accordion.ItemText>
                          {category.title}
                        </Accordion.ItemText>
                        <Accordion.ItemSecondaryText>
                          {usecaseCountLabel(category.rows.length)}
                        </Accordion.ItemSecondaryText>
                        <Accordion.ItemIndicator />
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent>
                        <CategorySection
                          checkedByChangeId={checkedByChangeId}
                          onToggle={toggleRow}
                          rows={category.rows}
                        />
                      </Accordion.ItemContent>
                    </Accordion.ItemRoot>
                  </div>
                ))}
              </Accordion.Root>
            ) : (
              categories.map((category) => (
                <CategorySection
                  key={category.key}
                  checkedByChangeId={checkedByChangeId}
                  onToggle={toggleRow}
                  rows={category.rows}
                  title={category.title}
                />
              ))
            )}
          </div>
          {created.length > 0 && (
            <div className="flex flex-col gap-4">
              <Divider />
              <h4 className="text-sm font-semibold text-[color:var(--color-text-neutral-primary)]">
                Navigation after applying changes
              </h4>
              <p className="text-xs text-[color:var(--color-text-neutral-secondary)]">
                Choose how to navigate after applying the changes.
              </p>
              <RadioGroup.Root
                onValueChange={(value) => setNavChoice(value as NavChoice)}
                value={navChoice}
              >
                <RadioGroup.Items className="flex flex-col gap-2">
                  <Radio
                    label="Keep current selection"
                    size="sm"
                    value="keep"
                  />
                  <Radio
                    label="Add created usecases to selection"
                    size="sm"
                    value="add"
                  />
                  <Radio
                    label="Switch to created usecases only"
                    size="sm"
                    value="switch"
                  />
                </RadioGroup.Items>
              </RadioGroup.Root>
            </div>
          )}
        </Dialog.Body>
        <Dialog.Footer>
          <Button
            emphasis="neutral"
            onClick={onCancel}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            emphasis="primary"
            onClick={handleOK}
            size="sm"
            variant="fill"
          >
            OK
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
