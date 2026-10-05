import {usecaseSelectionsMatch} from '~widgets/graph-designer/lib/usecase-selection';

describe('usecaseSelectionsMatch', () => {
  // Identical system-ID selections match.
  it('treats identical selections as equal', () => {
    expect(usecaseSelectionsMatch(['system-id-a'], ['system-id-a'])).toBe(true);
  });

  // Added, removed, or different system IDs do not match.
  it('detects added and removed usecases', () => {
    expect(usecaseSelectionsMatch(['system-id-a'], [])).toBe(false);
    expect(usecaseSelectionsMatch([], ['system-id-a'])).toBe(false);
    expect(usecaseSelectionsMatch(['system-id-a'], ['system-id-b'])).toBe(
      false,
    );
  });

  // Reordering system IDs does not change the selection.
  it('ignores selection order', () => {
    expect(
      usecaseSelectionsMatch(
        ['system-id-a', 'system-id-b'],
        ['system-id-b', 'system-id-a'],
      ),
    ).toBe(true);
  });

  // Duplicate system IDs represent one unique usecase selection.
  it('compares unique system IDs rather than array positions', () => {
    expect(
      usecaseSelectionsMatch(['system-id-a', 'system-id-a'], ['system-id-a']),
    ).toBe(true);
  });
});
