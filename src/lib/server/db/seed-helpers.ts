import { randomBytes } from 'node:crypto';
import type { SeedGuest } from './data';

export function makeToken(): string {
  return randomBytes(12).toString('base64url'); // 16 url-safe chars
}

export interface BuiltGroup {
  key: string;
  name: string;
  token: string;
}

export function buildInviteGroups(seedGuests: SeedGuest[]): BuiltGroup[] {
  const byKey = new Map<string, string[]>();
  for (const g of seedGuests) {
    const list = byKey.get(g.inviteGroup) ?? [];
    list.push(g.name);
    byKey.set(g.inviteGroup, list);
  }
  return [...byKey.entries()].map(([key, names]) => ({
    key,
    name: formatGroupName(names),
    token: makeToken()
  }));
}

function formatGroupName(names: string[]): string {
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}
