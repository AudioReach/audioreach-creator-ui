/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  AnyElementDto,
  ConfigElementDto,
  ElementTemplateArrayDto,
  StructDto,
} from '~entities/spf-module-data';
import {patchElements} from '~features/generic-tree-view/lib/patch-elements';

jest.mock('~shared/lib/logger');

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(
  name: string,
  value: string,
  extra: Partial<ConfigElementDto> = {},
): ConfigElementDto {
  return {isReadOnly: false, name, type: 'CONFIG_ELEMENT', value, ...extra};
}

function makeStruct(name: string, children: AnyElementDto[]): StructDto {
  return {
    isReadOnly: false,
    name,
    structType: 'struct',
    type: 'STRUCT',
    value: children,
  };
}

function makeArray(
  name: string,
  instances: AnyElementDto[],
  template: AnyElementDto[] = [],
): ElementTemplateArrayDto {
  return {
    isReadOnly: false,
    name,
    template,
    type: 'ELEMENT_TEMPLATE_ARRAY',
    value: instances,
  };
}

// ── patchElements ────────────────────────────────────────────────────────────

describe('patchElements', () => {
  describe('CONFIG_ELEMENT patching', () => {
    it('updates a matching CONFIG_ELEMENT value', () => {
      const elem = makeConfig('gain', '0x00000010');
      const values = new Map([['pid/gain', '0x00000020']]);
      const result = patchElements([elem], 'pid', [], values, new Map());
      expect((result[0] as ConfigElementDto).value).toBe('0x00000020');
    });

    it('returns the same object reference when value is unchanged', () => {
      const elem = makeConfig('gain', '0x00000010');
      const values = new Map([['pid/gain', '0x00000010']]);
      const result = patchElements([elem], 'pid', [], values, new Map());
      // identity preserved — no unnecessary allocation
      expect(result[0]).toBe(elem);
    });

    it('returns original element when key is absent from elementValues', () => {
      const elem = makeConfig('gain', '0x00000010');
      const result = patchElements([elem], 'pid', [], new Map(), new Map());
      expect(result[0]).toBe(elem);
    });

    it('patches element at a nested prefix path', () => {
      const elem = makeConfig('freq', '100');
      const values = new Map([['pid/cfg/freq', '200']]);
      const result = patchElements([elem], 'pid', ['cfg'], values, new Map());
      expect((result[0] as ConfigElementDto).value).toBe('200');
    });
  });

  describe('STRUCT patching', () => {
    it('updates a nested CONFIG_ELEMENT inside a STRUCT', () => {
      const inner = makeConfig('freq', '100');
      const struct = makeStruct('cfg', [inner]);
      const values = new Map([['pid/cfg/freq', '999']]);
      const result = patchElements([struct], 'pid', [], values, new Map());
      const patched = result[0] as StructDto;
      expect((patched.value[0] as ConfigElementDto).value).toBe('999');
    });

    it('preserves inner CONFIG_ELEMENT identity when no value changed', () => {
      const inner = makeConfig('freq', '100');
      const struct = makeStruct('cfg', [inner]);
      const result = patchElements([struct], 'pid', [], new Map(), new Map());
      const patched = result[0] as StructDto;
      // inner element should be the exact same reference (no allocation)
      expect(patched.value[0]).toBe(inner);
    });

    it('allocates a new STRUCT object when a nested value changes', () => {
      const inner = makeConfig('vol', '50');
      const struct = makeStruct('audio', [inner]);
      const values = new Map([['pid/audio/vol', '75']]);
      const result = patchElements([struct], 'pid', [], values, new Map());
      expect(result[0]).not.toBe(struct);
      expect((result[0] as StructDto).value).not.toBe(struct.value);
    });
  });

  describe('ELEMENT_TEMPLATE_ARRAY patching', () => {
    it('updates CONFIG_ELEMENT instances within an array', () => {
      const inst0 = makeConfig('bandGain', '10');
      const arr = makeArray('bands', [inst0]);
      const values = new Map([['pid/bandGain', '20']]);
      const result = patchElements([arr], 'pid', [], values, new Map());
      const patched = result[0] as ElementTemplateArrayDto;
      expect((patched.value[0] as ConfigElementDto).value).toBe('20');
    });

    it('respects count from arrayCounts — truncates instances', () => {
      const inst0 = makeConfig('f', '1');
      const inst1 = makeConfig('f', '2');
      const arr = makeArray('bands', [inst0, inst1]);
      // count=1 means only first instance should appear
      const counts = new Map([['pid/bands', 1]]);
      const result = patchElements([arr], 'pid', [], new Map(), counts);
      const patched = result[0] as ElementTemplateArrayDto;
      expect(patched.value).toHaveLength(1);
    });

    it('updates nested STRUCT instances inside an array', () => {
      const inner = makeConfig('val', '0');
      const inst = makeStruct('band[0]', [inner]);
      const arr = makeArray('bands', [inst]);
      const values = new Map([['pid/band[0]/val', '42']]);
      const result = patchElements([arr], 'pid', [], values, new Map());
      const patched = result[0] as ElementTemplateArrayDto;
      const patchedInst = patched.value[0] as StructDto;
      expect((patchedInst.value[0] as ConfigElementDto).value).toBe('42');
    });

    it('falls back to elem.value.length when key absent from arrayCounts', () => {
      const inst0 = makeConfig('f', '1');
      const inst1 = makeConfig('f', '2');
      const arr = makeArray('bands', [inst0, inst1]);
      const result = patchElements([arr], 'pid', [], new Map(), new Map());
      const patched = result[0] as ElementTemplateArrayDto;
      // no counts → preserve original length
      expect(patched.value).toHaveLength(2);
    });
  });
});
