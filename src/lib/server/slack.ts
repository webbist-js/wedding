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

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
