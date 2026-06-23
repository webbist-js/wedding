import { env } from '$env/dynamic/private';

export interface RsvpNotifyMember {
	name: string;
	isChild: boolean;
	isPlusOne: boolean;
	rsvpStatus: 'pending' | 'yes' | 'no';
	meal: 'veg' | 'non-veg' | null;
	dietaryNotes: string | null;
	attendanceType: 'day' | 'evening';
}

export interface RsvpNotifyPayload {
	groupName: string;
	members: RsvpNotifyMember[];
	message: string | null;
	allergiesNote: string | null;
	songRequest?: string | null;
	rsvpUrl?: string;
}

// Post a formatted RSVP notification to the wedding Slack channel.
// Configured via SLACK_WEBHOOK_URL; if unset, this is a no-op so dev still works.
// Always swallows errors so a Slack outage never breaks a guest's RSVP.
export async function notifyRSVP(payload: RsvpNotifyPayload): Promise<void> {
	const webhook = env.SLACK_WEBHOOK_URL;
	if (!webhook) return;

	const attending = payload.members.filter((m) => m.rsvpStatus === 'yes');
	const declining = payload.members.filter((m) => m.rsvpStatus === 'no');
	const kids = attending.filter((m) => m.isChild);
	const adults = attending.filter((m) => !m.isChild);
	const veg = adults.filter((m) => m.meal === 'veg');

	const lines = payload.members.map((m) => {
		const tick = m.rsvpStatus === 'yes' ? '✅' : m.rsvpStatus === 'no' ? '✗' : '·';
		let detail = '';
		if (m.rsvpStatus === 'yes') {
			if (m.isChild) detail = ' · child';
			else if (m.attendanceType === 'evening') detail = ' · evening (pizza)';
			else if (m.meal === 'veg') detail = ' · vegetarian';
			else if (m.meal === 'non-veg') detail = ' · standard menu';
			if (m.dietaryNotes) detail += ` · _${esc(m.dietaryNotes)}_`;
		}
		return `${tick} *${esc(m.name)}*${detail}`;
	});

	const summary: string[] = [];
	summary.push(`${attending.length}/${payload.members.length} attending`);
	if (kids.length) summary.push(`${kids.length} ${kids.length === 1 ? 'child' : 'children'}`);
	if (veg.length) summary.push(`${veg.length} vegetarian`);
	if (declining.length) summary.push(`${declining.length} declining`);

	const blocks: unknown[] = [
		{
			type: 'header',
			text: { type: 'plain_text', text: `🌿 RSVP from ${payload.groupName}`, emoji: true }
		},
		{
			type: 'section',
			text: { type: 'mrkdwn', text: lines.join('\n') }
		},
		{
			type: 'context',
			elements: [{ type: 'mrkdwn', text: summary.join(' · ') }]
		}
	];

	if (payload.message?.trim()) {
		blocks.push({
			type: 'section',
			text: { type: 'mrkdwn', text: `💬 _${esc(payload.message.trim())}_` }
		});
	}
	if (payload.allergiesNote?.trim()) {
		blocks.push({
			type: 'context',
			elements: [{ type: 'mrkdwn', text: `📝 ${esc(payload.allergiesNote.trim())}` }]
		});
	}
	if (payload.songRequest?.trim()) {
		blocks.push({
			type: 'context',
			elements: [{ type: 'mrkdwn', text: `🎵 *Song request:* ${esc(payload.songRequest.trim())}` }]
		});
	}
	if (payload.rsvpUrl) {
		blocks.push({
			type: 'context',
			elements: [{ type: 'mrkdwn', text: `<${payload.rsvpUrl}|Open their RSVP page →>` }]
		});
	}

	const ac = new AbortController();
	const timer = setTimeout(() => ac.abort(), 4000);
	try {
		await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: `RSVP from ${payload.groupName}`, // fallback for clients without block kit
				blocks
			}),
			signal: ac.signal
		});
	} catch (err) {
		console.error('Slack notify failed:', err);
	} finally {
		clearTimeout(timer);
	}
}

export type TimelineKind = 'week' | 'day' | 'day-of' | 'overdue';

export interface TimelineNotifyPayload {
	kind: TimelineKind;
	label: string;
	dueDateISO: string;
	phaseTitle: string;
	dashboardUrl?: string;
}

const HEADINGS: Record<TimelineKind, string> = {
	week: '📅 One week to go',
	day: '⏰ Due tomorrow',
	'day-of': '🌿 Due today',
	overdue: '🔴 Overdue'
};

export async function notifyTimelineItem(p: TimelineNotifyPayload): Promise<void> {
	const webhook = env.SLACK_WEBHOOK_URL;
	if (!webhook) return;

	let dueFormatted = p.dueDateISO;
	try {
		dueFormatted = new Date(p.dueDateISO + 'T00:00:00').toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	} catch {
		/* keep ISO fallback */
	}

	const blocks: unknown[] = [
		{
			type: 'header',
			text: { type: 'plain_text', text: HEADINGS[p.kind], emoji: true }
		},
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*${esc(p.label)}*` }
		},
		{
			type: 'context',
			elements: [
				{
					type: 'mrkdwn',
					text:
						p.kind === 'overdue'
							? `Was due ${dueFormatted}${p.phaseTitle ? ` · ${esc(p.phaseTitle)}` : ''}`
							: `Due ${dueFormatted}${p.phaseTitle ? ` · ${esc(p.phaseTitle)}` : ''}`
				}
			]
		}
	];

	if (p.dashboardUrl) {
		blocks.push({
			type: 'context',
			elements: [{ type: 'mrkdwn', text: `<${p.dashboardUrl}|Open the timeline →>` }]
		});
	}

	const ac = new AbortController();
	const timer = setTimeout(() => ac.abort(), 4000);
	try {
		await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				text: `${HEADINGS[p.kind]}: ${p.label}`,
				blocks
			}),
			signal: ac.signal
		});
	} catch (err) {
		console.error('Slack timeline notify failed:', err);
	} finally {
		clearTimeout(timer);
	}
}

// Shared low-level poster — Block Kit message to the webhook, best-effort.
// No-op when SLACK_WEBHOOK_URL is unset; always swallows errors / times out.
async function post(text: string, blocks: unknown[]): Promise<void> {
	const webhook = env.SLACK_WEBHOOK_URL;
	if (!webhook) return;
	const ac = new AbortController();
	const timer = setTimeout(() => ac.abort(), 4000);
	try {
		await fetch(webhook, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text, blocks }),
			signal: ac.signal
		});
	} catch (err) {
		console.error('Slack notify failed:', err);
	} finally {
		clearTimeout(timer);
	}
}

// ---- Appointments (calendar) ----
export type AppointmentKind = 'booked' | 'week' | 'day' | 'day-of';

export interface AppointmentNotifyPayload {
	kind: AppointmentKind;
	title: string;
	dateISO: string;
	time?: string | null;
	supplierName?: string | null;
	location?: string | null;
	notes?: string | null;
	dashboardUrl?: string;
}

const APPT_HEADINGS: Record<AppointmentKind, string> = {
	booked: '📅 New appointment booked',
	week: '📅 Appointment in a week',
	day: '⏰ Appointment tomorrow',
	'day-of': '🌿 Appointment today'
};

export async function notifyAppointment(p: AppointmentNotifyPayload): Promise<void> {
	if (!env.SLACK_WEBHOOK_URL) return;
	let when = p.dateISO;
	try {
		when = new Date(p.dateISO + 'T00:00:00').toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	} catch {
		/* keep ISO fallback */
	}
	if (p.time) when += ` · ${p.time}`;

	const ctx: string[] = [when];
	if (p.supplierName) ctx.push(esc(p.supplierName));
	if (p.location) ctx.push(`📍 ${esc(p.location)}`);

	const blocks: unknown[] = [
		{ type: 'header', text: { type: 'plain_text', text: APPT_HEADINGS[p.kind], emoji: true } },
		{ type: 'section', text: { type: 'mrkdwn', text: `*${esc(p.title)}*` } },
		{ type: 'context', elements: [{ type: 'mrkdwn', text: ctx.join(' · ') }] }
	];
	if (p.notes?.trim()) {
		blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `📝 ${esc(p.notes.trim())}` }] });
	}
	if (p.dashboardUrl) {
		blocks.push({
			type: 'context',
			elements: [{ type: 'mrkdwn', text: `<${p.dashboardUrl}|Open the calendar →>` }]
		});
	}
	await post(`${APPT_HEADINGS[p.kind]}: ${p.title}`, blocks);
}

// ---- Suppliers ----
export interface SupplierBookedPayload {
	category: string;
	name?: string | null;
	contact?: string | null;
	dashboardUrl?: string;
}

export async function notifySupplierBooked(p: SupplierBookedPayload): Promise<void> {
	if (!env.SLACK_WEBHOOK_URL) return;
	const blocks: unknown[] = [
		{ type: 'header', text: { type: 'plain_text', text: '✅ Supplier booked', emoji: true } },
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*${esc(p.category)}*${p.name ? ` — ${esc(p.name)}` : ''}` }
		}
	];
	if (p.contact) {
		blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `📞 ${esc(p.contact)}` }] });
	}
	if (p.dashboardUrl) {
		blocks.push({
			type: 'context',
			elements: [{ type: 'mrkdwn', text: `<${p.dashboardUrl}|Open suppliers →>` }]
		});
	}
	await post(`Supplier booked: ${p.category}${p.name ? ` — ${p.name}` : ''}`, blocks);
}

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
