import { and, eq, isNotNull } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db/index';
import { timelineItems, timelinePhases } from './db/schema';
import { notifyTimelineItem, type TimelineKind } from './slack';

// Return today's calendar date in the server's local zone, with the time component zeroed.
function startOfDay(d: Date = new Date()): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

function diffDays(target: Date, today: Date): number {
	const ms = target.getTime() - today.getTime();
	return Math.round(ms / (1000 * 60 * 60 * 24));
}

interface ThresholdMatch {
	kind: TimelineKind;
}

function thresholdsFor(daysUntilDue: number, alreadySent: Set<TimelineKind>): ThresholdMatch[] {
	const out: ThresholdMatch[] = [];
	if (daysUntilDue === 7 && !alreadySent.has('week')) out.push({ kind: 'week' });
	if (daysUntilDue === 1 && !alreadySent.has('day')) out.push({ kind: 'day' });
	if (daysUntilDue === 0 && !alreadySent.has('day-of')) out.push({ kind: 'day-of' });
	if (daysUntilDue < 0 && !alreadySent.has('overdue')) out.push({ kind: 'overdue' });
	return out;
}

// Scan undone, dated timeline items and fire any Slack reminders that
// haven't gone out yet. Idempotent: notifications_sent is updated after each
// item so subsequent runs in the same window are no-ops.
export async function runTimelineCheck(now: Date = new Date()): Promise<{ sent: number }> {
	const today = startOfDay(now);

	const items = await db
		.select()
		.from(timelineItems)
		.where(and(eq(timelineItems.done, false), isNotNull(timelineItems.dueDate)));

	let sent = 0;
	for (const item of items) {
		if (!item.dueDate) continue;
		const due = startOfDay(new Date(item.dueDate + 'T00:00:00'));
		if (Number.isNaN(due.getTime())) continue;

		const days = diffDays(due, today);
		const alreadySent = new Set(
			item.notificationsSent
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean) as TimelineKind[]
		);
		const matches = thresholdsFor(days, alreadySent);
		if (matches.length === 0) continue;

		const [phase] = await db
			.select()
			.from(timelinePhases)
			.where(eq(timelinePhases.id, item.phaseId));

		const base = env.PUBLIC_BASE_URL ?? '';
		const dashboardUrl = base ? `${base}/dashboard/timeline` : undefined;

		for (const m of matches) {
			await notifyTimelineItem({
				kind: m.kind,
				label: item.label,
				dueDateISO: item.dueDate,
				phaseTitle: phase?.title ?? '',
				dashboardUrl
			});
			alreadySent.add(m.kind);
			sent++;
		}

		await db
			.update(timelineItems)
			.set({ notificationsSent: [...alreadySent].join(',') })
			.where(eq(timelineItems.id, item.id));
	}

	return { sent };
}

// In-process scheduler — runs at server boot and then every hour.
// Idempotent thanks to notifications_sent, so multiple processes (or a hot
// reload in dev) won't duplicate messages.
let scheduled = false;
export function startTimelineScheduler() {
	if (scheduled || typeof setInterval !== 'function') return;
	scheduled = true;
	const HOUR = 60 * 60 * 1000;
	runTimelineCheck().catch((e) => console.error('timeline-check (boot) failed:', e));
	setInterval(() => {
		runTimelineCheck().catch((e) => console.error('timeline-check failed:', e));
	}, HOUR);
}
