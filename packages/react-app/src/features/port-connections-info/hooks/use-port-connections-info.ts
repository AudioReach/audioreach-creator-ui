/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useRef, useState} from 'react';

import type {Port} from '~entities/graph';
import {
  getControlLinkWithUsecases,
  getDataLinkWithUsecases,
  getModulesBySystemIds,
} from '~entities/usecases';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';

import {buildConnectionRows} from '../lib/build-connection-rows';
import type {PortConnectionsInfoState} from '../model/port-connections-info.types';

export function usePortConnectionsInfo(projectId: string): {
  close: () => void;
  open: (componentSystemId: string, port: Port) => void;
  state: PortConnectionsInfoState;
} {
  const [state, setState] = useState<PortConnectionsInfoState>({
    status: 'closed',
  });
  const requestIdRef = useRef(0);

  const open = useCallback(
    (componentSystemId: string, port: Port) => {
      const portSystemId = port.id;
      const requestId = ++requestIdRef.current;
      setState({componentSystemId, portSystemId, status: 'loading-links'});
      const fetchFn =
        port.portIoType === 'control'
          ? getControlLinkWithUsecases
          : getDataLinkWithUsecases;

      void fetchFn(projectId, componentSystemId, portSystemId).then(
        async (result) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          if (hasBlockingIssues(result) || !result.data) {
            showToast(
              getIssueMessage(result, 'Failed to load connections'),
              'danger',
            );
            setState({status: 'closed'});
            return;
          }
          const links = result.data;
          const otherModuleSystemIds = [
            ...new Set(
              links.map(({link}) => {
                const sourceId = link.sourceSystemId;
                return sourceId === componentSystemId
                  ? link.destinationSystemId
                  : sourceId;
              }),
            ),
          ];
          setState({
            componentSystemId,
            portSystemId,
            status: 'loading-modules',
          });
          const moduleResult = await getModulesBySystemIds(
            projectId,
            otherModuleSystemIds,
          );
          if (requestIdRef.current !== requestId) {
            return;
          }
          if (hasBlockingIssues(moduleResult) || !moduleResult.data) {
            setState({
              componentSystemId,
              message: getIssueMessage(
                moduleResult,
                'Failed to load module info',
              ),
              portSystemId,
              status: 'error',
            });
            return;
          }
          const rows = buildConnectionRows(
            links,
            moduleResult.data,
            componentSystemId,
          );
          setState({componentSystemId, portSystemId, rows, status: 'ready'});
        },
      );
    },
    [projectId],
  );

  const close = useCallback(() => {
    requestIdRef.current += 1;
    setState({status: 'closed'});
  }, []);

  return {close, open, state};
}
