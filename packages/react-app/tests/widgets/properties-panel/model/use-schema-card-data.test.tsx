/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {act, renderHook, waitFor} from '@testing-library/react';

import type {TreeViewItem} from '~features/generic-tree-view';
import type {ApiResult} from '~shared/api';
import type {PropertyDto} from '~shared/lib/property.dto';
import {
  type SchemaPropertyCommitResult,
  useSchemaCardData,
} from '~widgets/properties-panel/model/use-schema-card-data';

import {usePropertiesPanelStore} from '~widgets/properties-panel/model/use-properties-panel-store';

function makeProperty(
  naturalId: number,
  propertyName: string,
  systemId = `prop-${naturalId}`,
): PropertyDto {
  return {
    elements: [
      {
        isReadOnly: false,
        name: propertyName,
        policy: 'BASIC',
        type: 'ConfigElement',
        value: String(naturalId),
      },
    ],
    naturalId,
    propertyName,
    systemId,
  };
}

function successResult(data: PropertyDto[]): ApiResult<PropertyDto[]> {
  return {data, message: 'ok', success: true};
}

function saveResult(
  data: SchemaPropertyCommitResult,
): ApiResult<SchemaPropertyCommitResult> {
  return {data, message: 'ok', success: true};
}

describe('useSchemaCardData', () => {
  beforeEach(() => {
    usePropertiesPanelStore.setState({entries: {}});
  });

  it('fetches properties when entityId changes and exposes tree data', async () => {
    const property = makeProperty(1, 'Scenario ID');
    const fetchProperties = jest
      .fn()
      .mockResolvedValue(successResult([property]));

    const {rerender, result} = renderHook(
      ({entityId}) =>
        useSchemaCardData({
          entityId,
          entityType: 'subgraph',
          fetchProperties,
          projectId: 'proj-1',
          saveProperty: jest.fn(),
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
          entityType: 'subgraph',
          fetchProperties,
          projectId: 'proj-1',
          saveProperty: jest.fn(),
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
        issues: [
          {
            code: 'BACKEND_UNAVAILABLE',
            message: 'Backend unavailable',
            severity: 'ERROR',
          },
        ],
      })
      .mockResolvedValueOnce(successResult([property]));

    const {result} = renderHook(() =>
      useSchemaCardData({
        entityId: 'sg-1',
        entityType: 'subgraph',
        fetchProperties,
        projectId: 'proj-1',
        saveProperty: jest.fn(),
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
    const saveProperty = jest
      .fn()
      .mockResolvedValue(
        saveResult({property: nextProperty, type: 'replaceProperty'}),
      );
    const fetchProperties = jest
      .fn()
      .mockResolvedValue(successResult([property]));
    const onCommitSuccess = jest.fn();
    const {result} = renderHook(() =>
      useSchemaCardData({
        entityId: 'sg-1',
        entityType: 'subgraph',
        fetchProperties,
        onCommitSuccess,
        projectId: 'proj-1',
        saveProperty,
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

    expect(saveProperty).toHaveBeenCalledWith(
      expect.objectContaining({naturalId: 1}),
    );
    expect(result.current.data?.items[0]?.systemId).toBe('prop-1-next');
    expect(onCommitSuccess).toHaveBeenCalledWith(
      [dirtyItem],
      expect.arrayContaining([nextProperty]),
    );
  });

  it('ignores stale patch responses for a previous entityId', async () => {
    const firstProperty = makeProperty(1, 'Scenario ID');
    const secondProperty = makeProperty(2, 'Container Type');
    const fetchProperties = jest.fn((entityId: string) =>
      Promise.resolve(
        successResult(entityId === 'sg-1' ? [firstProperty] : [secondProperty]),
      ),
    );
    let resolvePatch!: (value: ApiResult<SchemaPropertyCommitResult>) => void;
    const saveProperty = jest.fn(
      () =>
        new Promise<ApiResult<SchemaPropertyCommitResult>>((resolve) => {
          resolvePatch = resolve;
        }),
    );
    const onCommitSuccess = jest.fn();
    const {rerender, result} = renderHook(
      ({entityId}) =>
        useSchemaCardData({
          entityId,
          entityType: 'subgraph',
          fetchProperties,
          onCommitSuccess,
          projectId: 'proj-1',
          saveProperty,
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
      resolvePatch(
        saveResult({property: firstProperty, type: 'replaceProperty'}),
      );
    });

    expect(result.current.data?.systemId).toBe('sg-2');
    expect(result.current.data?.items[0]?.name).toBe('Container Type');
    expect(onCommitSuccess).not.toHaveBeenCalled();
  });
});
