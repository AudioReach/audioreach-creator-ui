import {
  compareKeyPriority,
  findDistinctKeyAssignment,
} from '~shared/lib/distinct-key-assignment';

describe('compareKeyPriority', () => {
  it('orders by naturalId first', () => {
    expect(compareKeyPriority(1, 'a', 2, 'a')).toBeLessThan(0);
  });

  it('falls back to systemId when naturalId ties', () => {
    expect(compareKeyPriority(1, 'a', 1, 'b')).toBeLessThan(0);
    expect(compareKeyPriority(1, 'b', 1, 'a')).toBeGreaterThan(0);
    expect(compareKeyPriority(1, 'a', 1, 'a')).toBe(0);
  });
});

describe('findDistinctKeyAssignment', () => {
  it('assigns one candidate per token with no key reused', () => {
    const result = findDistinctKeyAssignment([
      [{key: {naturalId: 1, systemId: 'k1'}, pair: 'a'}],
      [{key: {naturalId: 2, systemId: 'k2'}, pair: 'b'}],
    ]);
    expect(result).toEqual(['a', 'b']);
  });

  it('backtracks when the greedy choice blocks a later token', () => {
    const result = findDistinctKeyAssignment([
      [{key: {naturalId: 1, systemId: 'k1'}, pair: 'a'}],
      [
        {key: {naturalId: 1, systemId: 'k1'}, pair: 'b'},
        {key: {naturalId: 2, systemId: 'k2'}, pair: 'c'},
      ],
    ]);
    expect(result).toEqual(['a', 'c']);
  });

  it('returns null when no distinct assignment exists', () => {
    const result = findDistinctKeyAssignment([
      [{key: {naturalId: 1, systemId: 'k1'}, pair: 'a'}],
      [{key: {naturalId: 1, systemId: 'k1'}, pair: 'b'}],
    ]);
    expect(result).toBeNull();
  });
});
