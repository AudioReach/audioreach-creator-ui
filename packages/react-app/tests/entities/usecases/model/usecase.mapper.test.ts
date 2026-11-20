/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  mapSubsystemResultsToCategories,
  mapUsecaseDtoToCategories,
} from '~entities/usecases/model/usecase.mapper';
import type {
  SubsystemFilteredUsecasesDto,
  UsecaseDto,
} from '~entities/usecases/model/usecase.dto';

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

    const categories = mapSubsystemResultsToCategories(results, 'values');

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

    const categories = mapSubsystemResultsToCategories(results, 'values');

    expect(categories[0]?.items[0]?.name).toBe('StreamPP_RX');
  });
});

describe('mapUsecaseDtoToCategories', () => {
  it('uses alias labels when alias preference is active', () => {
    const usecases: UsecaseDto[] = [
      {
        keyValuePairs: [createKeyValuePair('Speaker')],
        systemId: 'uc-new-1',
        usecaseAliasName: 'New Usecase',
        usecaseType: 'LINKED',
      },
    ];

    const categories = mapUsecaseDtoToCategories(usecases, 'alias');

    expect(categories[0]?.items[0]?.name).toBe('New Usecase');
  });

  it('uses key-value labels when keyvalues preference is active', () => {
    const usecases: UsecaseDto[] = [
      {
        keyValuePairs: [createKeyValuePair('Speaker')],
        systemId: 'uc-new-1',
        usecaseAliasName: 'New Usecase',
        usecaseType: 'LINKED',
      },
    ];

    const categories = mapUsecaseDtoToCategories(usecases, 'keyvalues');

    expect(categories[0]?.items[0]?.name).toBe('[Device: Speaker]');
  });

  it('uses value labels when values preference is active', () => {
    const usecases: UsecaseDto[] = [
      {
        keyValuePairs: [createKeyValuePair('Speaker')],
        systemId: 'uc-new-1',
        usecaseAliasName: 'New Usecase',
        usecaseType: 'LINKED',
      },
    ];

    const categories = mapUsecaseDtoToCategories(usecases, 'values');

    expect(categories[0]?.items[0]?.name).toBe('Speaker');
  });

  it.each(['values', 'keyvalues'] as const)(
    'shows Zero for empty key-value pairs with %s preference',
    (preference) => {
      const usecases: UsecaseDto[] = [
        {
          keyValuePairs: [],
          systemId: 'uc-new-1',
          usecaseAliasName: 'New Usecase',
          usecaseType: 'LINKED',
        },
      ];

      const categories = mapUsecaseDtoToCategories(usecases, preference);

      expect(categories[0]?.items[0]?.name).toBe('Zero');
    },
  );

  it('keeps the alias for empty key-value pairs with alias preference', () => {
    const usecases: UsecaseDto[] = [
      {
        keyValuePairs: [],
        systemId: 'uc-new-1',
        usecaseAliasName: 'New Usecase',
        usecaseType: 'LINKED',
      },
    ];

    const categories = mapUsecaseDtoToCategories(usecases, 'alias');

    expect(categories[0]?.items[0]?.name).toBe('New Usecase');
  });

  it('shows Zero when alias preference has no alias and no pairs', () => {
    const usecases: UsecaseDto[] = [
      {keyValuePairs: [], systemId: 'uc-new-1', usecaseType: 'LINKED'},
    ];

    const categories = mapUsecaseDtoToCategories(usecases, 'alias');

    expect(categories[0]?.items[0]?.name).toBe('Zero');
  });
});
