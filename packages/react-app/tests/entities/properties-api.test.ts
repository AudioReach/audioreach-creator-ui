/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
}));

import {
  fetchContainerProperties,
  getContainersBySystemIds,
  patchContainerProperty,
  updateContainerId,
} from '~entities/containers';
import {
  fetchControlLinkProperties,
  patchControlLinkProperties,
} from '~entities/control-links';
import {fetchSpfModuleProperties, patchSpfModule} from '~entities/spf-modules';
import {
  fetchSubgraphProperties,
  patchSubgraph,
  patchSubgraphProperty,
  patchSubgraphScenario,
  patchSubgraphVsid,
} from '~entities/subgraphs';
import {httpClient} from '~shared/api/http-client';
import type {PropertyDto} from '~shared/lib/property.dto';

const mockGet = jest.mocked(httpClient.get);
const mockPatch = jest.mocked(httpClient.patch);
const mockPut = jest.mocked(httpClient.put);

const propertyFixture: PropertyDto = {
  elements: [],
  hasDefinition: true,
  naturalId: 1,
  propertyName: 'Scenario ID',
  systemId: 'prop-1',
};

describe('properties API clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {properties: []},
      message: 'ok',
      success: true,
    });
    mockPatch.mockResolvedValue({data: [], message: 'ok', success: true});
    mockPut.mockResolvedValue({data: [], message: 'ok', success: true});
  });

  it('unwraps subgraph property responses and uses graph-data endpoints', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });

    const result = await fetchSubgraphProperties('proj-1', 'sg-1');
    await patchSubgraph('proj-1', 'sg-1', {name: 'Main'});
    await patchSubgraphProperty('proj-1', 'sg-1', 'prop-1', {
      elements: [],
      name: 'Scenario ID',
      systemId: 'prop-1',
    });
    await patchSubgraphScenario('proj-1', 'sg-1', {
      elements: [],
      name: 'Scenario ID',
      systemId: 'prop-1',
    });
    await patchSubgraphVsid('proj-1', 'sg-1', {
      elements: [],
      name: 'VSID',
      systemId: 'prop-vsid',
    });

    expect(result.data).toEqual([propertyFixture]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/properties',
    );
    expect(mockPatch).toHaveBeenCalledWith('/projects/proj-1/subgraphs/sg-1', {
      name: 'Main',
    });
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/properties/prop-1',
      {elements: [], name: 'Scenario ID', systemId: 'prop-1'},
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/scenario',
      {elements: [], name: 'Scenario ID', systemId: 'prop-1'},
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/vsid',
      {elements: [], name: 'VSID', systemId: 'prop-vsid'},
    );
  });

  it('unwraps container property responses and uses graph-data endpoints', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });
    mockPatch.mockResolvedValueOnce({
      data: {
        newContainerNaturalId: 2,
        newContainerSystemId: 'cnt-2',
      },
      message: 'ok',
      success: true,
    });
    mockPut.mockResolvedValueOnce({
      data: propertyFixture,
      message: 'ok',
      success: true,
    });

    const result = await fetchContainerProperties('proj-1', 'cnt-1');
    const updateContainerIdResult = await updateContainerId('proj-1', 'sg-1', {
      newContainerNaturalId: 2,
      oldContainerNaturalId: 1,
    });
    await patchContainerProperty('proj-1', 'cnt-1', 'prop-1', {
      elements: [],
      name: 'Container Type',
      systemId: 'prop-1',
    });

    expect(result.data).toEqual([propertyFixture]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/containers/cnt-1/properties',
    );
    expect(updateContainerIdResult.data).toEqual({
      newContainerNaturalId: 2,
      newContainerSystemId: 'cnt-2',
    });
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/container-id',
      {newContainerNaturalId: 2, oldContainerNaturalId: 1},
    );
    expect(mockPut).toHaveBeenCalledWith(
      '/projects/proj-1/containers/cnt-1/properties/prop-1',
      {elements: [], name: 'Container Type', systemId: 'prop-1'},
    );
  });

  it('GETs container natural IDs with comma-separated system IDs', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        {naturalId: 401, systemId: 'cnt-401'},
        {naturalId: 402, systemId: 'cnt-402'},
      ],
      message: 'ok',
      success: true,
    });

    const result = await getContainersBySystemIds('proj-1', [
      'cnt-401',
      'cnt-402',
    ]);

    expect(result.data).toEqual([
      {naturalId: 401, systemId: 'cnt-401'},
      {naturalId: 402, systemId: 'cnt-402'},
    ]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/containers?systemId=cnt-401,cnt-402',
    );
  });

  it('unwraps spf-module properties beside existing module patch', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        {
          ckvs: [
            {
              keyValuePairs: [],
              supportedParameters: [],
              systemId: 'ckv-1',
            },
          ],
          containerSystemId: 'cnt-1',
          controlPorts: [],
          dataPorts: [],
          maxControlPortsSupported: 0,
          maxInputPortsSupported: 0,
          maxOutputPortsSupported: 0,
          moduleDefinitionSystemId: 'mod-def-1',
          name: 'Decoder',
          naturalId: 1,
          parentSystemId: 'parent-1',
          properties: [propertyFixture],
          relatedEndPointLinks: [],
          subgraphSystemId: 'sg-1',
          systemId: 'mod-1',
          tags: [
            {
              naturalId: 1,
              systemId: 'tag-1',
              tagName: 'Tag 1',
              tkvs: [],
            },
          ],
        },
      ],
      message: 'ok',
      success: true,
    });

    await patchSpfModule('proj-1', 'mod-1', {alias: 'Decoder'});
    const result = await fetchSpfModuleProperties('proj-1', ['mod-1']);

    expect(result.data).toEqual([propertyFixture]);
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/spf-modules/mod-1',
      {alias: 'Decoder'},
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/spf-modules?systemId=mod-1&include=properties',
    );
  });

  it('unwraps control-link property fetch and patch responses', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });
    mockPatch.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });

    const fetchResult = await fetchControlLinkProperties('proj-1', 'cl-1');
    const patchResult = await patchControlLinkProperties('proj-1', 'cl-1', {
      properties: [],
    });

    expect(fetchResult.data).toEqual([propertyFixture]);
    expect(patchResult.data).toEqual([propertyFixture]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/control-links/cl-1/properties',
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/control-links/cl-1/properties',
      {properties: []},
    );
  });
});
