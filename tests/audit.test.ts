import { describe, it, expect } from 'vitest';
import { formatAuditLine } from '../src/lib/audit';

describe('formatAuditLine', () => {
	it('names the actor and the action', () => {
		expect(
			formatAuditLine({ action: 'update', entity: 'vendor', summary: 'Booked Adam Lowndes' }, 'Katie')
		).toBe('Katie updated vendor — Booked Adam Lowndes');
	});
	it('falls back to System when no user', () => {
		expect(
			formatAuditLine({ action: 'create', entity: 'note', summary: 'Added a note' }, null)
		).toBe('System created note — Added a note');
	});
});
