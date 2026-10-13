/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {mapSubsystemResultsToCategories} from '~entities/usecases/model/usecase.mapper';
import type {SubsystemFilteredUsecasesDto} from '~entities/usecases/model/usecase.dto';

const createKeyValuePair = (valueName: string) => ({
  key: {
    name: 'Device',
    naturalId: 1,
    systemId: 'key-1',
  },
  value: {
    name: valueName,
    naturalId: 2,
    systemId: 'value-1',
  },
});

const createUsecase = (systemId: string, valueName: string) => ({
  keyValuePairs: [createKeyValuePair(valueName)],
  systemId,
  usecaseType: 'Regular' as const,
});

describe('mapSubsystemResultsToCategories', () => {
  it('includes subsystem names in the group label', () => {
    const results: SubsystemFilteredUsecasesDto[] = [
      {
        filteredKv: {
          keyValuePairs: [createKeyValuePair('Playback')],
          subsystems: [
            {name: 'StreamPP_RX', subsystemNaturalId: 100},
            {name: 'COPP_RX', subsystemNaturalId: 101},
          ],
        },
        usecases: [createUsecase('uc-1', 'Playback')],
      },
    ];

    const categories = mapSubsystemResultsToCategories(results);

    expect(categories[0]?.items[0]?.name).toBe(
      'StreamPP_RX / COPP_RX - Playback',
    );
  });

  it('uses subsystem names when filtered key-values are empty', () => {
    const results: SubsystemFilteredUsecasesDto[] = [
      {
        filteredKv: {
          keyValuePairs: [],
          subsystems: [{name: 'StreamPP_RX', subsystemNaturalId: 100}],
        },
        usecases: [createUsecase('uc-1', 'Playback')],
      },
    ];

    const categories = mapSubsystemResultsToCategories(results);

    expect(categories[0]?.items[0]?.name).toBe('StreamPP_RX');
  });
});
