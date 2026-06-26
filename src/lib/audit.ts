// Client-safe audit vocabulary + formatting. No server-only imports here.

export interface AuditEntryLite {
	action: string; // 'create' | 'update' | 'delete'
	entity: string;
	summary: string;
}

const VERB: Record<string, string> = { create: 'created', update: 'updated', delete: 'deleted' };

// Render one audit row as a single human line for the Activity feed.
export function formatAuditLine(entry: AuditEntryLite, userName: string | null): string {
	const who = userName ?? 'System';
	const verb = VERB[entry.action] ?? entry.action;
	return `${who} ${verb} ${entry.entity} — ${entry.summary}`;
}
