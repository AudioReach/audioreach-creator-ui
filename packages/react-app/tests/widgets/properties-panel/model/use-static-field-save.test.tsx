/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {act, renderHook, waitFor} from '@testing-library/react';

import {useStaticFieldSave} from '~widgets/properties-panel/model/use-static-field-save';

describe('useStaticFieldSave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces text saves by 300 ms and clears errors on success', async () => {
    const onSave = jest.fn().mockResolvedValue({ok: true});
    const {result} = renderHook(() =>
      useStaticFieldSave({delayMs: 300, onSave, value: 'old'}),
    );

    act(() => result.current.saveText('new'));
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('new'));
    expect(result.current.error).toBeNull();
    expect(result.current.value).toBe('new');
  });

  it('reverts to last good value when save fails', async () => {
    const onSave = jest.fn().mockResolvedValue({
      message: 'Backend rejected value',
      ok: false,
    });
    const {result} = renderHook(() =>
      useStaticFieldSave({delayMs: 300, onSave, value: 'old'}),
    );

    await act(async () => {
      await result.current.saveImmediate('bad');
    });

    expect(result.current.value).toBe('old');
    expect(result.current.error).toBe('Backend rejected value');
  });
});
