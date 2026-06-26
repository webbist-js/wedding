import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { auditLog, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const entries = await db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			entity: auditLog.entity,
			summary: auditLog.summary,
			createdAt: auditLog.createdAt,
			userName: users.name
		})
		.from(auditLog)
		.leftJoin(users, eq(auditLog.userId, users.id))
		.orderBy(desc(auditLog.id))
		.limit(200);
	return { entries };
};
