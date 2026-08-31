/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import {
  fetchContainerProperties,
  patchContainer,
  patchContainerProperties,
} from '~entities/containers';
import {
  fetchControlLinkProperties,
  patchControlLinkProperties,
} from '~entities/control-links';
import type {ControlLinkResponseDto} from '~entities/control-links/api/control-links-api';
import {
  fetchSpfModuleProperties,
  patchSpfModule,
  patchSpfModuleProperties,
} from '~entities/spf-modules';
import {
  fetchSubgraphProperties,
  patchSubgraph,
  patchSubgraphProperties,
} from '~entities/subgraphs';
import {httpClient} from '~shared/api/http-client';
import type {PropertyDto} from '~shared/lib/property.dto';

const mockGet = jest.mocked(httpClient.get);
const mockPatch = jest.mocked(httpClient.patch);

const propertyFixture: PropertyDto = {
  elements: [],
  hasDefinition: true,
  propertyId: 1,
  propertyName: 'Scenario ID',
  systemId: 'prop-1',
};

const controlLinkResponseFixture: ControlLinkResponseDto = {
  connectionType: 'MODULE_MODULE',
  destinationPortSystemId: 'dst-port-1',
  destinationSystemId: 'dst-module-1',
  isDangling: false,
  sourcePortSystemId: 'src-port-1',
  sourceSystemId: 'src-module-1',
  systemId: 'cl-1',
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
  });

  it('unwraps subgraph property responses and uses graph-data endpoints', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });

    const result = await fetchSubgraphProperties('proj-1', 'sg-1');
    await patchSubgraph('proj-1', 'sg-1', {name: 'Main'});
    await patchSubgraphProperties('proj-1', 'sg-1', {properties: []});

    expect(result.data).toEqual([propertyFixture]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/properties',
    );
    expect(mockPatch).toHaveBeenCalledWith('/projects/proj-1/subgraphs/sg-1', {
      name: 'Main',
    });
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/subgraphs/sg-1/properties',
      {properties: []},
    );
  });

  it('unwraps container property responses and uses graph-data endpoints', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });

    const result = await fetchContainerProperties('proj-1', 'cnt-1');
    await patchContainer('proj-1', 'cnt-1', {containerId: 'cnt-2'});
    await patchContainerProperties('proj-1', 'cnt-1', {properties: []});

    expect(result.data).toEqual([propertyFixture]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/containers/cnt-1/properties',
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/containers/cnt-1',
      {containerId: 'cnt-2'},
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/containers/cnt-1/properties',
      {properties: []},
    );
  });

  it('unwraps spf-module properties beside existing module patch', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });

    await patchSpfModule('proj-1', 'mod-1', {alias: 'Decoder'});
    const result = await fetchSpfModuleProperties('proj-1', 'mod-1');
    await patchSpfModuleProperties('proj-1', 'mod-1', {properties: []});

    expect(result.data).toEqual([propertyFixture]);
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/spf-modules/mod-1',
      {alias: 'Decoder'},
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/spf-modules/mod-1/properties',
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/spf-modules/mod-1/properties',
      {properties: []},
    );
  });

  it('unwraps control-link property responses and returns control-link patch responses', async () => {
    mockGet.mockResolvedValueOnce({
      data: {properties: [propertyFixture]},
      message: 'ok',
      success: true,
    });
    mockPatch.mockResolvedValueOnce({
      data: [controlLinkResponseFixture],
      message: 'ok',
      success: true,
    });

    const fetchResult = await fetchControlLinkProperties('proj-1', 'cl-1');
    const patchResult = await patchControlLinkProperties('proj-1', 'cl-1', {
      properties: [],
    });

    expect(fetchResult.data).toEqual([propertyFixture]);
    expect(patchResult.data).toEqual([controlLinkResponseFixture]);
    expect(mockGet).toHaveBeenCalledWith(
      '/projects/proj-1/control-links/cl-1/properties',
    );
    expect(mockPatch).toHaveBeenCalledWith(
      '/projects/proj-1/control-links/cl-1/properties',
      {properties: []},
    );
  });
});
