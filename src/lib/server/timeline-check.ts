import { and, eq, isNotNull } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db/index';
import { timelineItems, timelinePhases, appointments, vendors } from './db/schema';
import {
	notifyTimelineItem,
	notifyAppointment,
	type TimelineKind,
	type AppointmentKind
} from './slack';

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

// Appointment reminders fire a week out, the day before, and on the day.
// (No "overdue" — a past appointment doesn't need chasing.)
const APPT_THRESHOLDS: { days: number; kind: AppointmentKind }[] = [
	{ days: 7, kind: 'week' },
	{ days: 1, kind: 'day' },
	{ days: 0, kind: 'day-of' }
];

// Scan upcoming appointments and fire any reminders not yet sent. Idempotent via
// appointments.notifications_sent, mirroring the timeline check above.
export async function runAppointmentCheck(now: Date = new Date()): Promise<{ sent: number }> {
	const today = startOfDay(now);
	const base = env.PUBLIC_BASE_URL ?? '';
	const dashboardUrl = base ? `${base}/dashboard/calendar` : undefined;

	const rows = await db
		.select({
			id: appointments.id,
			title: appointments.title,
			date: appointments.date,
			time: appointments.time,
			location: appointments.location,
			notes: appointments.notes,
			notificationsSent: appointments.notificationsSent,
			supplierCategory: vendors.category,
			supplierName: vendors.name
		})
		.from(appointments)
		.leftJoin(vendors, eq(appointments.vendorId, vendors.id));

	let sent = 0;
	for (const a of rows) {
		const due = startOfDay(new Date(a.date + 'T00:00:00'));
		if (Number.isNaN(due.getTime())) continue;
		const days = diffDays(due, today);

		const alreadySent = new Set(
			a.notificationsSent
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean) as AppointmentKind[]
		);
		const matches = APPT_THRESHOLDS.filter((t) => t.days === days && !alreadySent.has(t.kind));
		if (matches.length === 0) continue;

		const supplierName = a.supplierCategory
			? a.supplierName
				? `${a.supplierCategory} · ${a.supplierName}`
				: a.supplierCategory
			: null;

		for (const m of matches) {
			await notifyAppointment({
				kind: m.kind,
				title: a.title,
				dateISO: a.date,
				time: a.time,
				supplierName,
				location: a.location,
				notes: a.notes,
				dashboardUrl
			});
			alreadySent.add(m.kind);
			sent++;
		}

		await db
			.update(appointments)
			.set({ notificationsSent: [...alreadySent].join(',') })
			.where(eq(appointments.id, a.id));
	}

	return { sent };
}

// In-process scheduler — runs at server boot and then every hour.
// Idempotent thanks to notifications_sent, so multiple processes (or a hot
// reload in dev) won't duplicate messages.
let scheduled = false;
export function startTimelineScheduler() {
	if (scheduled || typeof setInterval !== 'function') return;
	// On serverless (Vercel) timers don't persist between invocations — Vercel Cron
	// hits /api/cron/timeline-check daily instead (see vercel.json). Skip the
	// in-process loop there; it stays active on long-running hosts.
	if (env.VERCEL || process.env.VERCEL) return;
	scheduled = true;
	const HOUR = 60 * 60 * 1000;
	const runAll = () => {
		runTimelineCheck().catch((e) => console.error('timeline-check failed:', e));
		runAppointmentCheck().catch((e) => console.error('appointment-check failed:', e));
	};
	runAll();
	setInterval(runAll, HOUR);
}
