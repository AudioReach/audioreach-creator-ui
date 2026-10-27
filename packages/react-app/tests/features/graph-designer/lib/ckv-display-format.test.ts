import {formatCkvEntry} from '~features/graph-designer/lib/ckv-display-format';

describe('formatCkvEntry', () => {
  const pairs = [
    {
      key: {id: 1, name: 'Device', systemId: 'k1', values: []},
      value: {id: 10, name: 'Speaker', systemId: 'v10'},
    },
    {
      key: {id: 2, name: 'Mode', systemId: 'k2', values: []},
      value: {id: 20, name: 'Call', systemId: 'v20'},
    },
  ];

  it('joins values only with + in value-only mode', () => {
    expect(formatCkvEntry(pairs, 'value-only')).toBe('Speaker+Call');
  });

  it('shows bracketed key:value pairs in key-value mode', () => {
    expect(formatCkvEntry(pairs, 'key-value')).toBe(
      '[Device: Speaker] [Mode: Call]',
    );
  });
});
