<script lang="ts">
	// A household's invite: its QR code, RSVP link and the personal note that
	// shows at the top of their RSVP page. Lives inside each guest-list card.
	let {
		id,
		token,
		name,
		personalMessage,
		base
	}: { id: number; token: string; name: string; personalMessage: string | null; base: string } = $props();

	const url = $derived(`${base}/rsvp/${token}`);
	const slug = $derived(
		name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || `group-${id}`
	);

	let copied = $state(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 1400);
		} catch {
			/* clipboard unavailable — the link is still selectable */
		}
	}
	async function saveMessage(value: string) {
		await fetch('/dashboard/guests/edit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind: 'group', id, field: 'personalMessage', value })
		});
	}
</script>

<div class="invite">
	<img class="qr" loading="lazy" width="96" height="96" src={`/dashboard/guests/qr?token=${token}&size=192`} alt={`QR code for ${name}'s RSVP page`} />
	<div class="body">
		<p class="eyebrow">Invite &amp; RSVP link</p>
		<div class="link-row">
			<a class="link" href={url} target="_blank" rel="noopener" title={url}>{url.replace(/^https?:\/\//, '')}</a>
			<button type="button" class="ghost" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
			<a class="dl" href={`/dashboard/guests/qr?token=${token}`} download={`qr-${slug}.png`}>Download QR</a>
		</div>
		<label class="msg">
			<span>Personal message — shown at the top of their RSVP page</span>
			<textarea rows="2" placeholder="A line just for them…" value={personalMessage ?? ''}
				onchange={(e) => saveMessage(e.currentTarget.value)}></textarea>
		</label>
	</div>
</div>

<style>
	.invite { display: grid; grid-template-columns: 96px 1fr; gap: 14px; align-items: start; }
	.qr { width: 96px; height: 96px; border-radius: 8px; border: 1px solid var(--line2); background: #fff; }
	.body { min-width: 0; display: grid; gap: 8px; }
	.eyebrow { margin: 0; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
	.link-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
	.link { flex: 1; min-width: 120px; font-size: 12px; color: var(--sage-deep); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
	.link:hover { text-decoration: underline; }
	.ghost, .dl {
		background: transparent; color: var(--sage-deep); border: 1px solid var(--line); border-radius: 7px; padding: 5px 10px; cursor: pointer;
		font: inherit; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; text-decoration: none; white-space: nowrap;
	}
	.ghost:hover { border-color: var(--sage); background: var(--sage-soft); }
	.dl { background: var(--sage); color: #fff; border-color: var(--sage); }
	.dl:hover { background: var(--sage-deep); border-color: var(--sage-deep); }
	.msg { display: grid; gap: 4px; }
	.msg span { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
	.msg textarea { font: inherit; font-size: 12.5px; color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; resize: vertical; min-height: 44px; width: 100%; box-sizing: border-box; background: #fff; }
	@media (max-width: 480px) {
		.invite { grid-template-columns: 1fr; }
	}
</style>
