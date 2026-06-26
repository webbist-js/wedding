import { db } from './db/index';
import { auditLog } from './db/schema';

export interface AuditInput {
	action: 'create' | 'update' | 'delete';
	entity: string;
	entityId?: number | null;
	summary: string;
}

// Append one row to the audit log. Best-effort: a logging failure must never
// break the write that triggered it.
export async function recordAudit(locals: App.Locals, input: AuditInput): Promise<void> {
	try {
		await db.insert(auditLog).values({
			userId: locals.user?.id ?? null,
			action: input.action,
			entity: input.entity,
			entityId: input.entityId ?? null,
			summary: input.summary,
			createdAt: new Date()
		});
	} catch (e) {
		console.error('recordAudit failed', e);
	}
}
