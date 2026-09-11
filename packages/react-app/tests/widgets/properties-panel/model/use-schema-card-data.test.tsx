/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {act, renderHook, waitFor} from '@testing-library/react';

import type {TreeViewItem} from '~features/generic-tree-view';
import type {ApiResult} from '~shared/api';
import type {PropertyDto} from '~shared/lib/property.dto';
import {useSchemaCardData} from '~widgets/properties-panel/model/use-schema-card-data';

function makeProperty(
  propertyId: number,
  propertyName: string,
  systemId = `prop-${propertyId}`,
): PropertyDto {
  return {
    elements: [
      {
        isReadOnly: false,
        name: propertyName,
        policy: 'BASIC',
        type: 'CONFIG_ELEMENT',
        value: String(propertyId),
      },
    ],
    propertyId,
    propertyName,
    systemId,
  };
}

function successResult(data: PropertyDto[]): ApiResult<PropertyDto[]> {
  return {data, message: 'ok', success: true};
}

describe('useSchemaCardData', () => {
  it('fetches properties when entityId changes and exposes tree data', async () => {
    const property = makeProperty(1, 'Scenario ID');
    const fetchProperties = jest
      .fn()
      .mockResolvedValue(successResult([property]));

    const {rerender, result} = renderHook(
      ({entityId}) =>
        useSchemaCardData({
          entityId,
          fetchProperties,
          patchProperties: jest.fn(),
        }),
      {initialProps: {entityId: 'sg-1'}},
    );

    await waitFor(() => expect(result.current.data?.items[0]?.id).toBe('1'));

    rerender({entityId: 'sg-2'});

    await waitFor(() => expect(fetchProperties).toHaveBeenCalledWith('sg-2'));
    await waitFor(() => expect(result.current.data?.systemId).toBe('sg-2'));
  });

  it('ignores stale fetch responses for a previous entityId', async () => {
    const property = makeProperty(1, 'Scenario ID');
    let resolveFirst!: (value: ApiResult<PropertyDto[]>) => void;
    const fetchProperties = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ApiResult<PropertyDto[]>>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(successResult([property]));

    const {rerender, result} = renderHook(
      ({entityId}) =>
        useSchemaCardData({
          entityId,
          fetchProperties,
          patchProperties: jest.fn(),
        }),
      {initialProps: {entityId: 'sg-1'}},
    );

    rerender({entityId: 'sg-2'});
    resolveFirst(successResult([]));

    await waitFor(() => expect(result.current.data?.systemId).toBe('sg-2'));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it('sets a load error and retries with load', async () => {
    const property = makeProperty(1, 'Scenario ID');
    const fetchProperties = jest
      .fn()
      .mockResolvedValueOnce({
        message: 'Backend unavailable',
        success: false,
      })
      .mockResolvedValueOnce(successResult([property]));

    const {result} = renderHook(() =>
      useSchemaCardData({
        entityId: 'sg-1',
        fetchProperties,
        patchProperties: jest.fn(),
      }),
    );

    await waitFor(() =>
      expect(result.current.error).toBe('Backend unavailable'),
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data?.items[0]?.name).toBe('Scenario ID');
  });

  it('patches dirty tree items and reconciles returned authoritative data', async () => {
    const property = makeProperty(1, 'Scenario ID');
    const nextProperty = makeProperty(1, 'Scenario ID', 'prop-1-next');
    const patchProperties = jest
      .fn()
      .mockResolvedValue(successResult([nextProperty]));
    const fetchProperties = jest
      .fn()
      .mockResolvedValue(successResult([property]));
    const onCommitSuccess = jest.fn();
    const {result} = renderHook(() =>
      useSchemaCardData({
        entityId: 'sg-1',
        fetchProperties,
        onCommitSuccess,
        patchProperties,
      }),
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());

    const dirtyItem: TreeViewItem = {
      elements: property.elements,
      id: '1',
      name: 'Scenario ID',
    };
    await act(async () => {
      await result.current.handleCommit([dirtyItem]);
    });

    expect(patchProperties).toHaveBeenCalledWith({
      properties: [expect.objectContaining({propertyId: 1})],
    });
    expect(result.current.data?.source).toBe('set');
    expect(result.current.data?.items[0]?.systemId).toBe('prop-1-next');
    expect(onCommitSuccess).toHaveBeenCalledWith([dirtyItem], [nextProperty]);
  });

  it('ignores stale patch responses for a previous entityId', async () => {
    const firstProperty = makeProperty(1, 'Scenario ID');
    const secondProperty = makeProperty(2, 'Container Type');
    const fetchProperties = jest.fn((entityId: string) =>
      Promise.resolve(
        successResult(entityId === 'sg-1' ? [firstProperty] : [secondProperty]),
      ),
    );
    let resolvePatch!: (value: ApiResult<PropertyDto[]>) => void;
    const patchProperties = jest.fn(
      () =>
        new Promise<ApiResult<PropertyDto[]>>((resolve) => {
          resolvePatch = resolve;
        }),
    );
    const onCommitSuccess = jest.fn();
    const {rerender, result} = renderHook(
      ({entityId}) =>
        useSchemaCardData({
          entityId,
          fetchProperties,
          onCommitSuccess,
          patchProperties,
        }),
      {initialProps: {entityId: 'sg-1'}},
    );
    await waitFor(() => expect(result.current.data?.systemId).toBe('sg-1'));

    const dirtyItem: TreeViewItem = {
      elements: firstProperty.elements,
      id: '1',
      name: 'Scenario ID',
    };
    act(() => {
      void result.current.handleCommit([dirtyItem]);
    });

    rerender({entityId: 'sg-2'});
    await waitFor(() => expect(result.current.data?.systemId).toBe('sg-2'));

    await act(async () => {
      resolvePatch(successResult([firstProperty]));
    });

    expect(result.current.data?.systemId).toBe('sg-2');
    expect(result.current.data?.items[0]?.name).toBe('Container Type');
    expect(onCommitSuccess).not.toHaveBeenCalled();
  });
});
