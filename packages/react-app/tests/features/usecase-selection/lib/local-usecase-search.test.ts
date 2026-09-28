/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseCategory} from '~entities/usecases';
import {filterUsecasesLocally} from '~features/usecase-selection/lib/local-usecase-search';

// ── Test data ─────────────────────────────────────────────────────────────────

/** Leaf item: Speaker_Mic — key "DeviceTX", value "Speaker_Mic" */
const ITEM_SPEAKER: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'DeviceTX', naturalId: 1, systemId: 'k1'},
      value: {name: 'Speaker_Mic', naturalId: 1, systemId: 'v1'},
    },
  ],
  name: 'Speaker_Mic',
  systemId: 'UC_001',
};

/** Leaf item: HFP_Rx_Playback — key "StreamRX", value "HFP_Rx_Playback" */
const ITEM_HFP: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'StreamRX', naturalId: 2, systemId: 'k2'},
      value: {
        name: 'HFP_Rx_Playback',
        naturalId: 2,
        systemId: 'v2',
      },
    },
  ],
  name: 'HFP_Rx_Playback',
  systemId: 'UC_002',
};

/** Leaf item: BT_SCO — key "BtProfile", value "BT_SCO" */
const ITEM_BT_SCO: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'BtProfile', naturalId: 3, systemId: 'k3'},
      value: {name: 'BT_SCO', naturalId: 3, systemId: 'v3'},
    },
  ],
  name: 'BT_SCO',
  systemId: 'UC_003',
};

/** Leaf item with two key-value pairs (AND across both must be satisfiable) */
const ITEM_MULTI_KV: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'DeviceRX', naturalId: 4, systemId: 'k4'},
      value: {name: 'BT_Rx', naturalId: 4, systemId: 'v4'},
    },
    {
      key: {name: 'BtProfile', naturalId: 5, systemId: 'k5'},
      value: {name: 'SCO', naturalId: 5, systemId: 'v5'},
    },
  ],
  name: 'BT_Rx • SCO',
  systemId: 'UC_004',
};

/**
 * Leaf item whose custom `name` does not appear anywhere in its
 * keyValuePairs labels — isolates matching on `name` alone.
 */
const ITEM_CUSTOM_NAME: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'DeviceRX', naturalId: 8, systemId: 'k8'},
      value: {name: 'BT_Rx', naturalId: 8, systemId: 'v8'},
    },
  ],
  name: 'My Custom Usecase',
  systemId: 'UC_005',
};

/** Flat category with three leaf usecases */
const flatCategories: UsecaseCategory[] = [
  {
    expanded: true,
    items: [ITEM_SPEAKER, ITEM_HFP, ITEM_BT_SCO],
    name: 'Default',
  },
];

/** Grouped/nested category (subsystem-style) — one group with two children */
const groupedCategories: any[] = [
  {
    expanded: true,
    items: [
      {
        children: [ITEM_SPEAKER, ITEM_HFP],
        expanded: true,
        keyValuePairs: [
          {
            key: {name: 'StreamPP_RX', naturalId: 6, systemId: 'k6'},
            value: {
              name: 'StreamPP_RX',
              naturalId: 6,
              systemId: 'v6',
            },
          },
        ],
        name: 'StreamPP_RX',
      },
      {
        children: [ITEM_BT_SCO],
        expanded: true,
        keyValuePairs: [
          {
            key: {name: 'StreamPP_TX', naturalId: 7, systemId: 'k7'},
            value: {
              name: 'StreamPP_TX',
              naturalId: 7,
              systemId: 'v7',
            },
          },
        ],
        name: 'StreamPP_TX',
      },
    ],
    name: 'Subsystem Filtered Usecases',
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('filterUsecasesLocally — empty / whitespace search term', () => {
  it('returns categories unchanged for an empty search term', () => {
    expect(filterUsecasesLocally(flatCategories, '')).toEqual(flatCategories);
  });

  it('returns categories unchanged for a whitespace-only search term', () => {
    expect(filterUsecasesLocally(flatCategories, '   ')).toEqual(
      flatCategories,
    );
  });
});

describe('filterUsecasesLocally — single-term substring (contains) match', () => {
  it('matches a full value name', () => {
    const result = filterUsecasesLocally(flatCategories, 'Speaker_Mic');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('matches a full key name', () => {
    const result = filterUsecasesLocally(flatCategories, 'DeviceTX');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('is case-insensitive', () => {
    const result = filterUsecasesLocally(flatCategories, 'speaker_mic');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('matches a partial/substring prefix of a value name', () => {
    const result = filterUsecasesLocally(flatCategories, 'Speaker');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('matches a partial/substring suffix of a value name', () => {
    const result = filterUsecasesLocally(flatCategories, 'Mic');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('matches a partial/substring fragment in the middle of a value name', () => {
    const result = filterUsecasesLocally(flatCategories, 'eaker_Mi');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('matches a partial/substring fragment of a key name', () => {
    const result = filterUsecasesLocally(flatCategories, 'Device');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('returns no categories when nothing matches', () => {
    const result = filterUsecasesLocally(flatCategories, 'NonExistentTerm');
    expect(result).toEqual([]);
  });
});

describe('filterUsecasesLocally — matching on item.name', () => {
  it('matches an item whose name matches but whose kv labels do not', () => {
    const categories: UsecaseCategory[] = [
      {expanded: true, items: [ITEM_CUSTOM_NAME], name: 'Default'},
    ];
    const result = filterUsecasesLocally(categories, 'Custom Usecase');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_CUSTOM_NAME]);
  });

  it('is case-insensitive when matching on name', () => {
    const categories: UsecaseCategory[] = [
      {expanded: true, items: [ITEM_CUSTOM_NAME], name: 'Default'},
    ];
    const result = filterUsecasesLocally(categories, 'custom usecase');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_CUSTOM_NAME]);
  });

  it('still matches via kv labels when the term is not found in name', () => {
    // ITEM_SPEAKER.name is 'Speaker_Mic', which does not contain 'DeviceTX' —
    // falls through to the keyValuePairs check.
    const result = filterUsecasesLocally(flatCategories, 'DeviceTX');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('matches an item via name inside an AND (+) expression', () => {
    const categories: UsecaseCategory[] = [
      {expanded: true, items: [ITEM_CUSTOM_NAME], name: 'Default'},
    ];
    const result = filterUsecasesLocally(categories, 'Custom+BT_Rx');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_CUSTOM_NAME]);
  });
});

describe('filterUsecasesLocally — AND (+) operator', () => {
  it('matches an item satisfying two terms via two different key-value pairs', () => {
    const categories: UsecaseCategory[] = [
      {expanded: true, items: [ITEM_MULTI_KV], name: 'Default'},
    ];
    const result = filterUsecasesLocally(categories, 'BT_Rx+SCO');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_MULTI_KV]);
  });

  it('excludes items that only satisfy one of two AND terms', () => {
    const result = filterUsecasesLocally(
      flatCategories,
      'Speaker_Mic+HFP_Rx_Playback',
    );
    // No single leaf item has both labels — AND across a single item's kv
    // collection means neither Speaker_Mic nor HFP_Rx_Playback matches alone.
    expect(result).toHaveLength(0);
  });
});

describe('filterUsecasesLocally — OR (|) operator', () => {
  it('matches items satisfying either term', () => {
    const result = filterUsecasesLocally(flatCategories, 'Speaker_Mic|BT_SCO');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual(
      expect.arrayContaining([ITEM_SPEAKER, ITEM_BT_SCO]),
    );
    expect(result[0].items).toHaveLength(2);
  });
});

describe('filterUsecasesLocally — parentheses grouping / precedence', () => {
  it('evaluates (A|B)+C with AND binding tighter than OR', () => {
    // (BT_Rx | HFP_Rx_Playback) + SCO
    // ITEM_MULTI_KV has BT_Rx AND SCO → should match via the OR branch BT_Rx.
    const categories: UsecaseCategory[] = [
      {
        expanded: true,
        items: [ITEM_MULTI_KV, ITEM_HFP],
        name: 'Default',
      },
    ];
    const result = filterUsecasesLocally(
      categories,
      '(BT_Rx|HFP_Rx_Playback)+SCO',
    );
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_MULTI_KV]);
  });

  it('without grouping, A+B|C is (A AND B) OR C', () => {
    // Speaker_Mic+HFP_Rx_Playback|BT_SCO → (Speaker_Mic AND HFP_Rx_Playback) OR BT_SCO
    // No item has both Speaker_Mic and HFP_Rx_Playback, but BT_SCO alone matches.
    const result = filterUsecasesLocally(
      flatCategories,
      'Speaker_Mic+HFP_Rx_Playback|BT_SCO',
    );
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_BT_SCO]);
  });
});

describe('filterUsecasesLocally — nested/grouped categories (subsystem-style)', () => {
  it('recursively filters children and keeps only matching group items', () => {
    const result = filterUsecasesLocally(groupedCategories, 'Speaker_Mic');
    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].name).toBe('StreamPP_RX');
    expect(result[0].items[0].children).toEqual([ITEM_SPEAKER]);
  });

  it('prunes empty groups and categories when nothing matches', () => {
    const result = filterUsecasesLocally(groupedCategories, 'NoMatch');
    expect(result).toEqual([]);
  });

  it('keeps multiple groups when each has at least one matching child', () => {
    const result = filterUsecasesLocally(
      groupedCategories,
      'Speaker_Mic|BT_SCO',
    );
    expect(result).toHaveLength(1);
    expect(result[0].items.map((item) => item.name)).toEqual([
      'StreamPP_RX',
      'StreamPP_TX',
    ]);
  });
});

describe('filterUsecasesLocally — graceful handling of malformed input', () => {
  it('treats a trailing incomplete + operator as the term alone', () => {
    const result = filterUsecasesLocally(flatCategories, 'Speaker_Mic+');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('treats a trailing incomplete | operator as the term alone', () => {
    const result = filterUsecasesLocally(flatCategories, 'Speaker_Mic|');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });

  it('does not throw on an unclosed parenthesis', () => {
    expect(() =>
      filterUsecasesLocally(flatCategories, '(Speaker_Mic'),
    ).not.toThrow();
    const result = filterUsecasesLocally(flatCategories, '(Speaker_Mic');
    expect(result).toHaveLength(1);
    expect(result[0].items).toEqual([ITEM_SPEAKER]);
  });
});
