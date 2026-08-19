/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {ChevronDown, ChevronRight} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';

import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import type {TkvParameter} from './module-tag-keys-config.types';

interface TkvParametersSectionProps {
  isEditable: boolean;
  onParametersChange: (parameters: TkvParameter[]) => void;
  parameters: TkvParameter[];
  visible: boolean;
}

export function TkvParametersSection({
  isEditable,
  onParametersChange,
  parameters,
  visible,
}: TkvParametersSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!visible) {
    return null;
  }

  const handleSelectAll = (checked: boolean) => {
    const updatedParams = parameters.map((param) => ({...param, checked}));
    onParametersChange(updatedParams);
  };

  const handleParameterChange = (index: number, checked: boolean) => {
    const updatedParams = [...parameters];
    updatedParams[index] = {...updatedParams[index], checked};
    onParametersChange(updatedParams);
  };

  const allChecked = parameters.every((p) => p.checked);
  const someChecked = parameters.some((p) => p.checked) && !allChecked;

  return (
    <div className="bg-primary border-neutral-02 overflow-hidden rounded border shadow-sm">
      {/* Header */}
      <div className="bg-secondary border-neutral-02 flex items-center gap-2 border-b px-1 py-1">
        <IconButton
          aria-label="Toggle TKV parameters section"
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
        <h4 className="text-neutral-primary text-base font-semibold">
          Configure PIDs for TKVs
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
          <table className="bg-primary w-4/5 border-collapse">
            <thead>
              <tr>
                <th className="bg-secondary border-neutral-02 text-neutral-primary w-32 border px-3 py-2 text-center font-semibold">
                  <div className="flex flex-col items-center gap-1">
                    <span>Support TKV</span>
                    <Checkbox
                      aria-label="Select/Deselect All"
                      checked={allChecked}
                      disabled={!isEditable}
                      indeterminate={someChecked}
                      onCheckedChange={(checked) => handleSelectAll(checked)}
                      size="sm"
                      title="Select/Deselect All"
                    />
                  </div>
                </th>
                <th className="bg-secondary border-neutral-02 text-neutral-primary border px-3 py-2 text-left font-semibold">
                  PID
                </th>
                <th className="bg-secondary border-neutral-02 text-neutral-primary border px-3 py-2 text-left font-semibold">
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, index) => (
                <tr key={param.pid}>
                  <td className="border-neutral-02 border px-3 py-2">
                    <div className="flex justify-center">
                      <Checkbox
                        aria-label={`Select parameter ${param.name}`}
                        checked={param.checked}
                        disabled={!isEditable}
                        onCheckedChange={(checked) =>
                          handleParameterChange(index, checked)
                        }
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="border-neutral-02 text-neutral-secondary border px-3 py-2 font-mono text-sm">
                    {ConvertNumberToHexString(param.pid) || param.pid}
                  </td>
                  <td className="border-neutral-02 text-neutral-primary border px-3 py-2 text-sm">
                    {param.name}
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
