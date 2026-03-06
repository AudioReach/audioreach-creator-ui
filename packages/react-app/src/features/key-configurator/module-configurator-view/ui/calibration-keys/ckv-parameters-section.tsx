/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {ChevronDown, ChevronRight} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';

import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import type {CkvParameter} from './calibration-keys-config.types';

interface CkvParametersSectionProperties {
  isEditable: boolean;
  onParametersChange: (parameters: CkvParameter[]) => void;
  parameters: CkvParameter[];
}

export function CkvParametersSection({
  isEditable,
  onParametersChange,
  parameters,
}: CkvParametersSectionProperties) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    const updatedParameters = parameters.map((parameter) => ({...parameter, checked}));
    onParametersChange(updatedParameters);
  };

  const handleParameterChange = (index: number, checked: boolean) => {
    const updatedParameters = [...parameters];
    updatedParameters[index] = {...updatedParameters[index], checked};
    onParametersChange(updatedParameters);
  };

  const allChecked = parameters.every((p) => p.checked);
  const someChecked = parameters.some((p) => p.checked) && !allChecked;

  return (
    <div
      className="overflow-hidden rounded border shadow-sm"
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        borderColor: 'var(--color-border-neutral-02)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-1 py-1"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border-neutral-02)',
        }}
      >
        <IconButton
          aria-label="Toggle CKV parameters section"
          icon={
            isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          }
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="ghost"
        />
        <h4
          className="ml-2 text-base font-semibold"
          style={{color: 'var(--color-text-neutral-primary)'}}
        >
          Configure PIDs for CKVs
        </h4>
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isCollapsed
            ? 'max-h-0 overflow-hidden'
            : 'max-h-[300px] overflow-auto'
        }`}
      >
        <div className="p-4">
          <table
            className="w-4/5 border-collapse"
            style={{backgroundColor: 'var(--color-surface-primary)'}}
          >
            <thead>
              <tr>
                <th
                  className="w-32 border px-3 py-2 text-center font-semibold"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border-neutral-02)',
                    color: 'var(--color-text-neutral-primary)',
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>Support CKV</span>
                    <Checkbox
                      aria-label="Select/Deselect All"
                      checked={allChecked}
                      disabled={!isEditable}
                      indeterminate={someChecked}
                      onChange={(e) =>
                        handleSelectAll((e.target as HTMLInputElement).checked)
                      }
                      size="sm"
                      title="Select/Deselect All"
                    />
                  </div>
                </th>
                <th
                  className="border px-3 py-2 text-left font-semibold"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border-neutral-02)',
                    color: 'var(--color-text-neutral-primary)',
                  }}
                >
                  PID
                </th>
                <th
                  className="border px-3 py-2 text-left font-semibold"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border-neutral-02)',
                    color: 'var(--color-text-neutral-primary)',
                  }}
                >
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((parameter, index) => (
                <tr key={parameter.pid}>
                  <td
                    className="border px-3 py-2"
                    style={{borderColor: 'var(--color-border-neutral-02)'}}
                  >
                    <div className="flex justify-center">
                      <Checkbox
                        aria-label={`Select parameter ${parameter.name}`}
                        checked={parameter.checked}
                        disabled={!isEditable}
                        onChange={(e) =>
                          handleParameterChange(
                            index,
                            (e.target as HTMLInputElement).checked,
                          )
                        }
                        size="sm"
                      />
                    </div>
                  </td>
                  <td
                    className="border px-3 py-2 text-left font-mono text-sm"
                    style={{
                      borderColor: 'var(--color-border-neutral-02)',
                      color: 'var(--color-text-neutral-secondary)',
                    }}
                  >
                    {ConvertNumberToHexString(parameter.pid) || parameter.pid}
                  </td>
                  <td
                    className="border px-3 py-2 text-left text-sm"
                    style={{
                      borderColor: 'var(--color-border-neutral-02)',
                      color: 'var(--color-text-neutral-primary)',
                    }}
                  >
                    {parameter.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
