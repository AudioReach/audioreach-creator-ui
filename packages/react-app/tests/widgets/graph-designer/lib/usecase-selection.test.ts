import {usecaseSelectionsMatch} from '~widgets/graph-designer/lib/usecase-selection';

describe('usecaseSelectionsMatch', () => {
  it('treats identical selections as equal', () => {
    expect(usecaseSelectionsMatch(['usecase-a'], ['usecase-a'])).toBe(true);
  });

  it('detects added, removed, and reordered usecases', () => {
    expect(usecaseSelectionsMatch(['usecase-a'], [])).toBe(false);
    expect(usecaseSelectionsMatch([], ['usecase-a'])).toBe(false);
    expect(
      usecaseSelectionsMatch(['usecase-a', 'usecase-b'], [
        'usecase-b',
        'usecase-a',
      ]),
    ).toBe(false);
  });
});
