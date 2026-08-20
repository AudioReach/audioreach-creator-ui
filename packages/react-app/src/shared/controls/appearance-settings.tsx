/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Moon, Sun} from 'lucide-react';

import {Divider} from '@qualcomm-ui/react/divider';
import {Radio, RadioGroup} from '@qualcomm-ui/react/radio';

import {Brand, Theme} from '~entities/appearance';
import {useAppearance} from '~shared/providers/theme-provider';

const BRAND_OPTIONS: {label: string; value: Brand}[] = (
  Object.values(Brand) as Brand[]
).map((brand) => ({
  label: brand[0].toUpperCase() + brand.slice(1),
  value: brand,
}));

export function AppearanceSettings() {
  const [appearance, setAppearance] = useAppearance();

  const handleBrandChange = (value: string | null) => {
    const brand = BRAND_OPTIONS.find((option) => option.value === value)?.value;
    if (brand) {
      setAppearance({...appearance, brand});
    }
  };

  const handleThemeChange = (value: string | null) => {
    if (value === Theme.DARK || value === Theme.LIGHT) {
      setAppearance({...appearance, theme: value});
    }
  };

  return (
    <div className="w-100 max-w-[calc(100vw-2rem)] p-5">
      <h2 className="text-neutral-primary text-sm font-semibold">Appearance</h2>
      <Divider className="my-5" />
      <RadioGroup
        itemsProps={{
          className: 'grid grid-cols-3 gap-x-3 gap-y-3',
        }}
        label="Brand"
        onValueChange={handleBrandChange}
        size="sm"
        value={appearance.brand}
      >
        {BRAND_OPTIONS.map(({label, value}) => (
          <Radio
            key={value}
            label={label}
            labelProps={{className: 'whitespace-nowrap'}}
            value={value}
          />
        ))}
      </RadioGroup>
      <Divider className="my-5" />
      <RadioGroup
        itemsProps={{className: 'flex gap-4'}}
        label="Theme"
        onValueChange={handleThemeChange}
        size="sm"
        value={appearance.theme}
      >
        <Radio
          label={
            <span className="inline-flex items-center gap-1">
              Light <Sun aria-hidden size={14} />
            </span>
          }
          value={Theme.LIGHT}
        />
        <Radio
          label={
            <span className="inline-flex items-center gap-1">
              Dark <Moon aria-hidden size={14} />
            </span>
          }
          value={Theme.DARK}
        />
      </RadioGroup>
    </div>
  );
}
