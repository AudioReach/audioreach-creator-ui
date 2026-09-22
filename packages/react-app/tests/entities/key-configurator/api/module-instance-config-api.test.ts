/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

import {getModuleInstanceTuningConfig} from '~entities/key-configurator';
import {httpClient} from '~shared/api/http-client';

const mockGet = jest.mocked(httpClient.get);

describe('module-instance-config-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GETs tuning config with comma-separated module system IDs', async () => {
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
          containerSystemId: 'container-1',
          controlPorts: [],
          dataPorts: [],
          maxControlPortsSupported: 0,
          maxInputPortsSupported: 0,
          maxOutputPortsSupported: 0,
          moduleDefinitionSystemId: 'module-definition-1',
          name: 'Module 1',
          naturalId: 1,
          parentSystemId: 'parent-1',
          relatedEndPointLinks: [],
          subgraphSystemId: 'subgraph-1',
          systemId: 'module-1',
          tags: [
            {
              naturalId: 10,
              systemId: 'tag-1',
              tagName: 'Tag 1',
              tkvs: [],
            },
          ],
        },
      ],
    });

    const result = await getModuleInstanceTuningConfig('project-1', [
      'module-1',
      'module-2',
    ]);

    expect(mockGet).toHaveBeenCalledWith(
      '/projects/project-1/spf-modules?systemId=module-1,module-2&include=ckvs,tags',
    );
    expect(result.data).toEqual([
      {
        ckvs: [
          {
            keyValuePairs: [],
            supportedParameters: [],
            systemId: 'ckv-1',
          },
        ],
        moduleInstanceSystemId: 'module-1',
        tags: [
          {
            naturalId: 10,
            systemId: 'tag-1',
            tagName: 'Tag 1',
            tkvs: [],
          },
        ],
      },
    ]);
  });
});
