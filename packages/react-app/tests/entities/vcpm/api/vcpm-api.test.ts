/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {httpClient} from '~shared/api';
import {
  createVcpmCkvs,
  deleteVcpmCkv,
  getVcpmCalData,
  getVcpmCkvs,
  updateVcpmCalData,
} from '~entities/vcpm';

jest.mock('~shared/api', () => ({
  ...jest.requireActual('~shared/api'),
  httpClient: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe('vcpm-api', () => {
  const projectId = 'proj-1';
  const subgraphId = 'sg-1';

  it('getVcpmCkvs calls GET on the vcpm-ckv resource', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue({data: {ckv: []}});
    await getVcpmCkvs(projectId, subgraphId);
    expect(httpClient.get).toHaveBeenCalledWith(
      `/projects/${projectId}/subgraphs/${subgraphId}/vcpm-ckv`,
    );
  });

  it('getVcpmCalData calls GET on the cal-data sub-resource', async () => {
    (httpClient.get as jest.Mock).mockResolvedValue({data: {calData: []}});
    await getVcpmCalData(projectId, subgraphId);
    expect(httpClient.get).toHaveBeenCalledWith(
      `/projects/${projectId}/subgraphs/${subgraphId}/vcpm-ckv/cal-data`,
    );
  });

  it('createVcpmCkvs posts the request body', async () => {
    (httpClient.post as jest.Mock).mockResolvedValue({
      data: {addedCkvs: [], removedCkvSystemIds: []},
    });
    await createVcpmCkvs(projectId, subgraphId, {
      ckv: [{valueSystemIds: ['a']}],
    });
    expect(httpClient.post).toHaveBeenCalledWith(
      `/projects/${projectId}/subgraphs/${subgraphId}/vcpm-ckv`,
      {ckv: [{valueSystemIds: ['a']}]},
    );
  });

  it('deleteVcpmCkv calls DELETE on the ckv-specific path', async () => {
    (httpClient.delete as jest.Mock).mockResolvedValue({data: undefined});
    await deleteVcpmCkv(projectId, subgraphId, 'ckv-1');
    expect(httpClient.delete).toHaveBeenCalledWith(
      `/projects/${projectId}/subgraphs/${subgraphId}/vcpm-ckv/ckv-1`,
    );
  });

  it('updateVcpmCalData puts with retries disabled', async () => {
    (httpClient.put as jest.Mock).mockResolvedValue({
      data: {elements: [], name: 'p', systemId: 'p-1'},
    });
    await updateVcpmCalData(projectId, subgraphId, 'ckv-1', {
      elements: [],
      name: 'p',
      systemId: 'p-1',
    });
    expect(httpClient.put).toHaveBeenCalledWith(
      `/projects/${projectId}/subgraphs/${subgraphId}/vcpm-ckv/ckv-1/cal-data`,
      {elements: [], name: 'p', systemId: 'p-1'},
      {retries: 0},
    );
  });
});
