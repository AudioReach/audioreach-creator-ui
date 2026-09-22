/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    delete: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

import {
  createSpfModule,
  deleteSpfModule,
  fetchSpfModuleProperties,
  patchSpfModule,
} from '~entities/spf-modules/api/spf-modules-api';
import type {RemoveSpfModuleResponseDto} from '~entities/spf-modules/model/spf-module-crud.dto';
import type {SpfModuleDto} from '~entities/usecases/model/usecase-component.dto';
import {httpClient} from '~shared/api/http-client';

const mockGet = jest.mocked(httpClient.get);
const mockPost = jest.mocked(httpClient.post);
const mockDelete = jest.mocked(httpClient.delete);
const mockPatch = jest.mocked(httpClient.patch);

describe('spf-modules-api — module CRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSpfModule', () => {
    it('POSTs to the project-scoped spf-modules endpoint with the request body', async () => {
      const mockModule: SpfModuleDto = {
        alias: 'Mod A',
        changeInfo: {changeType: 'CREATE'},
        containerId: 1,
        controlPorts: [],
        dataPorts: [],
        heapId: 0,
        id: 1,
        maxControlPortsSupported: 0,
        maxInputPortsSupported: 0,
        maxOutputPortsSupported: 0,
        moduleId: 300,
        name: 'Mod A',
        relatedEndPointLinks: [],
        subgraphId: '5',
        systemId: 'mod-1',
      };
      mockPost.mockResolvedValue({
        data: mockModule,
        message: 'ok',
        success: true,
      });

      const result = await createSpfModule('proj-1', {
        moduleDefinitionSystemId: '300',
        processorSystemId: '1',
      });

      expect(mockPost).toHaveBeenCalledWith('/projects/proj-1/spf-modules', {
        moduleDefinitionSystemId: '300',
        processorSystemId: '1',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockModule);
    });
  });

  describe('deleteSpfModule', () => {
    it('DELETEs the module by systemId under the project scope', async () => {
      const mockResponse: RemoveSpfModuleResponseDto = {
        deleted: {
          containers: [],
          controlLinks: [],
          dataLinks: [],
          spfModules: [{systemId: 'sys-mod-1'}],
          subgraphs: [],
        },
        updated: {
          containers: [],
          usecases: [],
        },
      };
      mockDelete.mockResolvedValue({
        data: mockResponse,
        message: 'ok',
        success: true,
      });

      const result = await deleteSpfModule('proj-1', 'sys-mod-1');

      expect(mockDelete).toHaveBeenCalledWith(
        '/projects/proj-1/spf-modules/sys-mod-1',
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('patchSpfModule', () => {
    it('PATCHes the module by systemId with the partial request body', async () => {
      const mockModule: SpfModuleDto = {
        alias: 'New Alias',
        changeInfo: {changeType: 'UPDATE'},
        containerId: 1,
        controlPorts: [],
        dataPorts: [],
        heapId: 0,
        id: 1,
        maxControlPortsSupported: 0,
        maxInputPortsSupported: 0,
        maxOutputPortsSupported: 0,
        moduleId: 300,
        name: 'Mod A',
        relatedEndPointLinks: [],
        subgraphId: '5',
        systemId: 'sys-mod-1',
      };
      mockPatch.mockResolvedValue({
        data: mockModule,
        message: 'ok',
        success: true,
      });

      const result = await patchSpfModule('proj-1', 'sys-mod-1', {
        alias: 'New Alias',
      });

      expect(mockPatch).toHaveBeenCalledWith(
        '/projects/proj-1/spf-modules/sys-mod-1',
        {alias: 'New Alias'},
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockModule);
    });
  });

  describe('fetchSpfModuleProperties', () => {
    it('GETs properties with comma-separated module system IDs', async () => {
      mockGet.mockResolvedValue({
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
            properties: [
              {
                elements: [],
                hasDefinition: true,
                naturalId: 1,
                propertyName: 'Gain',
                systemId: 'prop-1',
              },
            ],
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
      });

      const result = await fetchSpfModuleProperties('proj-1', [
        'mod-1',
        'mod-2',
      ]);

      expect(mockGet).toHaveBeenCalledWith(
        '/projects/proj-1/spf-modules?systemId=mod-1,mod-2&include=properties',
      );
      expect(result.data).toEqual([
        {
          elements: [],
          hasDefinition: true,
          naturalId: 1,
          propertyName: 'Gain',
          systemId: 'prop-1',
        },
      ]);
    });
  });
});
