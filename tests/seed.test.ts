import { describe, it, expect } from 'vitest';
import { buildInviteGroups, makeToken } from '../src/lib/server/db/seed-helpers';
import { SEED_GUESTS } from '../src/lib/server/db/data';

describe('buildInviteGroups', () => {
  it('creates one group per unique inviteGroup key', () => {
    const groups = buildInviteGroups(SEED_GUESTS);
    const keys = new Set(SEED_GUESTS.map((g) => g.inviteGroup));
    expect(groups.length).toBe(keys.size);
  });

  it('every group has a non-empty unique token', () => {
    const groups = buildInviteGroups(SEED_GUESTS);
    const tokens = groups.map((g) => g.token);
    expect(tokens.every((t) => t.length >= 16)).toBe(true);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('group name lists its members', () => {
    const groups = buildInviteGroups([
      { name: 'Dan Grady', side: 'G', relationshipGroup: 'x', attendanceType: 'day', inviteGroup: 'dan-zoe-grady' },
      { name: 'Zoe Grady', side: 'G', relationshipGroup: 'x', attendanceType: 'day', inviteGroup: 'dan-zoe-grady' }
    ]);
    expect(groups[0].name).toContain('Dan');
    expect(groups[0].name).toContain('Zoe');
  });
});

describe('makeToken', () => {
  it('produces a url-safe token', () => {
    expect(makeToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
