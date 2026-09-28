/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  isInterUsecaseLink,
  toControlLinkType,
} from '~entities/usecases';

describe('link type helpers', () => {
  it.each([
    ['INTER_USECASE', true],
    ['NORMAL', false],
    ['EC', false],
  ] as const)('identifies %s inter-usecase state as %s', (linkType, expected) => {
    expect(isInterUsecaseLink(linkType)).toBe(expected);
  });

  it.each(['NORMAL', 'INTER_USECASE'] as const)(
    'accepts %s as a control link type',
    (linkType) => {
      expect(toControlLinkType(linkType)).toBe(linkType);
    },
  );

  it('rejects EC as a control link type', () => {
    expect(() => toControlLinkType('EC')).toThrow(
      'EC link type is only valid for data links',
    );
  });
});
