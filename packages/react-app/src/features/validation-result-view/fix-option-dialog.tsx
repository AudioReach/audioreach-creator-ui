/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {Button} from '@qualcomm-ui/react/button';
import {Dialog} from '@qualcomm-ui/react/dialog';
import {Radio, RadioGroup} from '@qualcomm-ui/react/radio';

import type {ApiIssueFixOption} from '~shared/api';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

interface FixOptionDialogProps {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (option: ApiIssueFixOption) => void;
  open: boolean;
  result: ValidationResult;
}

function isExecutable(option: ApiIssueFixOption): boolean {
  return option.requiredClientInputs.length === 0;
}

export function FixOptionDialog({
  isSubmitting,
  onCancel,
  onConfirm,
  open,
  result,
}: FixOptionDialogProps) {
  const options = result.fixOptions ?? [];
  const executableOptions = options.filter(isExecutable);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  useEffect(() => {
    const nextOptions = result.fixOptions?.filter(isExecutable) ?? [];
    setSelectedSystemId(
      nextOptions.length === 1 ? nextOptions[0].systemId : null,
    );
  }, [open, result.fixOptions, result.id]);

  const selectedOption = executableOptions.find(
    (option) => option.systemId === selectedSystemId,
  );

  const handleConfirm = (): void => {
    if (selectedOption) {
      onConfirm(selectedOption);
    }
  };

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
      scrollBehavior="inside"
      size="md"
    >
      <Dialog.FloatingPortal>
        <Dialog.Body>
          <Dialog.Heading>Auto Fix</Dialog.Heading>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              {result.errorCode && (
                <p className="text-neutral-secondary text-xs font-semibold">
                  {result.errorCode}
                </p>
              )}
              <p className="text-neutral-primary text-sm">{result.message}</p>
            </div>
            <RadioGroup.Root
              onValueChange={setSelectedSystemId}
              value={selectedSystemId}
            >
              <RadioGroup.Items className="flex flex-col gap-2">
                {options.map((option) => {
                  const disabled = !isExecutable(option);
                  return (
                    <div
                      key={option.systemId}
                      className="border-neutral-border rounded-md border p-3"
                    >
                      <Radio
                        disabled={disabled || isSubmitting}
                        label={option.description}
                        size="sm"
                        value={option.systemId}
                      />
                      {disabled && (
                        <p className="text-neutral-secondary mt-2 text-xs">
                          Requires additional input.
                        </p>
                      )}
                    </div>
                  );
                })}
              </RadioGroup.Items>
            </RadioGroup.Root>
          </div>
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
            disabled={!selectedOption || isSubmitting}
            emphasis="primary"
            onClick={handleConfirm}
            size="sm"
            variant="fill"
          >
            Confirm
          </Button>
        </Dialog.Footer>
      </Dialog.FloatingPortal>
    </Dialog.Root>
  );
}
