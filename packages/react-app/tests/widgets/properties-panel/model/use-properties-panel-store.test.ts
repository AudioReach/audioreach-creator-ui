/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~entities/spf-modules', () => ({
  fetchSpfModuleProperties: jest.fn(),
}));

import {fetchSpfModuleProperties} from '~entities/spf-modules';
import type {PropertyDto} from '~shared/lib/property.dto';
import {refreshCachedModulePropertiesForContainer} from '~widgets/properties-panel/model/module-properties-coordinator';
import {
  propertiesEntryKey,
  usePropertiesPanelStore,
} from '~widgets/properties-panel/model/use-properties-panel-store';

const mockFetchSpfModuleProperties = jest.mocked(fetchSpfModuleProperties);

function makeProperty(
  naturalId: number,
  propertyName: string,
  systemId = `prop-${String(naturalId)}`,
  value = String(naturalId),
): PropertyDto {
  return {
    elements: [
      {
        isReadOnly: false,
        name: propertyName,
        policy: 'BASIC',
        type: 'ConfigElement',
        value,
      },
    ],
    hasDefinition: true,
    naturalId,
    propertyName,
    systemId,
  };
}

describe('usePropertiesPanelStore', () => {
  beforeEach(() => {
    usePropertiesPanelStore.setState({entries: {}});
    jest.clearAllMocks();
  });

  it('replaces one property without dropping siblings', () => {
    const first = makeProperty(1, 'One');
    const second = makeProperty(2, 'Two');
    const nextFirst = makeProperty(1, 'One', 'prop-1', 'updated');
    const store = usePropertiesPanelStore.getState();

    store.replaceProperties('proj-1', 'container', 'cnt-1', [first, second]);
    store.replaceProperty('proj-1', 'container', 'cnt-1', nextFirst);

    const key = propertiesEntryKey('proj-1', 'container', 'cnt-1');
    expect(usePropertiesPanelStore.getState().entries[key]?.properties).toEqual(
      [nextFirst, second],
    );
  });

  it('replaces a complete collection after scenario refresh', () => {
    const store = usePropertiesPanelStore.getState();
    const scenario = makeProperty(0x08001010, 'Scenario');

    store.replaceProperties('proj-1', 'subgraph', 'sg-1', [
      makeProperty(1, 'Old'),
    ]);
    store.replaceProperties('proj-1', 'subgraph', 'sg-1', [scenario]);

    const key = propertiesEntryKey('proj-1', 'subgraph', 'sg-1');
    expect(usePropertiesPanelStore.getState().entries[key]?.properties).toEqual(
      [scenario],
    );
  });

  it('propagates VSID elements only to cached affected subgraphs', () => {
    const store = usePropertiesPanelStore.getState();
    const oldVsid = makeProperty(0x080010cc, 'VSID', 'vsid-prop', '1');
    const newElements = makeProperty(
      0x080010cc,
      'VSID',
      'vsid-prop',
      '2',
    ).elements;

    store.replaceProperties('proj-1', 'subgraph', 'sg-1', [oldVsid]);
    store.replaceProperties('proj-1', 'subgraph', 'sg-2', [oldVsid]);
    store.applySubgraphVsidUpdate('proj-1', ['sg-2', 'sg-3'], newElements);

    const sg1Key = propertiesEntryKey('proj-1', 'subgraph', 'sg-1');
    const sg2Key = propertiesEntryKey('proj-1', 'subgraph', 'sg-2');
    expect(
      usePropertiesPanelStore.getState().entries[sg1Key]?.properties[0]
        ?.elements,
    ).toBe(oldVsid.elements);
    expect(
      usePropertiesPanelStore.getState().entries[sg2Key]?.properties[0]
        ?.elements,
    ).toBe(newElements);
    expect(mockFetchSpfModuleProperties).not.toHaveBeenCalled();
  });

  it('refreshes only cached modules for a container', async () => {
    const store = usePropertiesPanelStore.getState();
    const nextProperty = makeProperty(10, 'Module Schema');
    store.replaceProperties('proj-1', 'module', 'mod-1', []);
    mockFetchSpfModuleProperties.mockResolvedValue({
      data: [nextProperty],
      message: 'ok',
      success: true,
    });

    await refreshCachedModulePropertiesForContainer('proj-1', [
      'mod-1',
      'mod-2',
    ]);

    expect(mockFetchSpfModuleProperties).toHaveBeenCalledTimes(1);
    expect(mockFetchSpfModuleProperties).toHaveBeenCalledWith(
      'proj-1',
      'mod-1',
    );
    expect(
      usePropertiesPanelStore.getState().entries[
        propertiesEntryKey('proj-1', 'module', 'mod-1')
      ]?.properties,
    ).toEqual([nextProperty]);
  });
});
