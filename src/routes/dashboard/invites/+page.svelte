<script lang="ts">
	let { data } = $props();

	async function saveMessage(id: number, message: string) {
		await fetch('/dashboard/invites/message', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id, message })
		});
	}

	async function copyLink(url: string, el: HTMLButtonElement) {
		try {
			await navigator.clipboard.writeText(url);
			const original = el.textContent;
			el.textContent = 'Copied';
			setTimeout(() => {
				el.textContent = original;
			}, 1400);
		} catch {
			/* ignore */
		}
	}
</script>

<p class="hint">
	One card per household. Add a personal note for each (it shows at the top of their RSVP page),
	share the link, or download the QR code as a PNG for the printed save-the-dates.
</p>

<div class="cards">
	{#each data.rows as r (r.id)}
		<div class="invite">
			<div class="top">
				<div class="qr">{@html r.qr}</div>
				<div class="who">
					<p class="eyebrow">Katie &amp; Alex · 2 April 2027</p>
					<h3 class="script">{r.name}</h3>
					<p class="members">{r.members.map((m) => m.name).join(' · ')}</p>
					<p class="status">
						<span
							class="dot"
							class:done={r.responded === r.total}
							class:partial={r.responded > 0 && r.responded < r.total}
						></span>
						<span class="status-text">{r.responded}/{r.total} replied</span>
					</p>
				</div>
			</div>

			<div class="link-row">
				<a class="link" href={r.url} target="_blank" rel="noopener" title={r.url}>
					{r.url.replace(/^https?:\/\//, '')}
				</a>
				<button type="button" class="ghost" onclick={(e) => copyLink(r.url, e.currentTarget)}>
					Copy
				</button>
				<a class="dl" href={`/dashboard/invites/qr?token=${r.token}`} download={`qr-${r.slug}.png`}>Download QR</a>
			</div>

			<label class="msg">
				<span>Personal message (optional — shown at the top of their RSVP page)</span>
				<textarea
					rows="2"
					placeholder="A line just for them…"
					value={r.personalMessage}
					onchange={(e) => saveMessage(r.id, (e.target as HTMLTextAreaElement).value)}
				></textarea>
			</label>
		</div>
	{/each}
</div>

{#if data.pageCount > 1}
	<nav class="pager" aria-label="Pages">
		<a class="pg" class:disabled={data.page <= 1} href={`?page=${data.page - 1}`} aria-disabled={data.page <= 1}>← Prev</a>
		<span class="pginfo">Page {data.page} of {data.pageCount} · {data.total} households</span>
		<a class="pg" class:disabled={data.page >= data.pageCount} href={`?page=${data.page + 1}`} aria-disabled={data.page >= data.pageCount}>Next →</a>
	</nav>
{/if}

<style>
	.hint {
		color: var(--body);
		max-width: 560px;
		margin-bottom: 24px;
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 18px;
		margin-top: 28px;
	}
	.pager .pg {
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 8px 16px;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--sage-deep);
		text-decoration: none;
	}
	.pager .pg:hover {
		border-color: var(--sage);
		background: var(--sage-soft);
	}
	.pager .pg.disabled {
		opacity: 0.4;
		pointer-events: none;
	}
	.pginfo {
		font-size: 12px;
		color: var(--muted);
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
		gap: 20px;
	}
	.invite {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 24px 26px;
		transition: box-shadow 0.24s ease, transform 0.24s ease;
	}
	.invite:hover {
		box-shadow: 0 8px 22px rgba(33, 31, 26, 0.06);
		transform: translateY(-2px);
	}
	.invite .top {
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: 22px;
		align-items: center;
	}
	.qr {
		width: 150px;
		height: 150px;
	}
	.qr :global(svg) {
		width: 100%;
		height: 100%;
	}
	.who {
		min-width: 0;
	}
	.who .eyebrow {
		font-size: 9.5px;
		letter-spacing: 0.32em;
		color: var(--faint);
		margin: 0;
	}
	.who h3 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: 26px;
		line-height: 1.1;
		margin: 8px 0 6px;
		color: var(--ink);
	}
	.members {
		font-size: 13px;
		color: var(--body);
		line-height: 1.5;
		margin: 0;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--rule);
	}
	.dot.partial {
		background: var(--tan);
	}
	.dot.done {
		background: var(--sage);
	}

	.link-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 18px;
		padding-top: 16px;
		border-top: 1px solid var(--line2);
		flex-wrap: wrap;
	}
	.link {
		flex: 1;
		min-width: 0;
		font-size: 12.5px;
		color: var(--sage-deep);
		text-decoration: none;
		border-bottom: 1px solid transparent;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.link:hover {
		border-bottom-color: var(--sage);
	}
	.ghost,
	.dl {
		background: transparent;
		color: var(--sage-deep);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 7px 12px;
		cursor: pointer;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 500;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		font-family: inherit;
	}
	.ghost:hover,
	.dl:hover {
		border-color: var(--sage);
		background: var(--sage-soft);
	}
	.dl {
		background: var(--sage);
		color: #fff;
		border-color: var(--sage);
	}
	.dl:hover {
		background: var(--sage-deep);
		border-color: var(--sage-deep);
	}

	.msg {
		display: grid;
		gap: 6px;
		margin-top: 16px;
		padding-top: 14px;
		border-top: 1px solid var(--line2);
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.msg textarea {
		font: inherit;
		font-size: 13.5px;
		text-transform: none;
		letter-spacing: normal;
		color: var(--ink);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 10px 12px;
		resize: vertical;
		min-height: 56px;
	}
</style>
