<script lang="ts">
	// A padlock that marks a row as "set & confirmed". Locked rows render
	// read-only and the server refuses edits other than the lock itself.
	let {
		locked,
		onToggle,
		label = 'set & confirmed',
		size = 26
	}: {
		locked: boolean;
		onToggle: (next: boolean) => void;
		label?: string;
		size?: number;
	} = $props();
</script>

<button
	type="button"
	class="lock"
	class:locked
	style={`--s:${size}px`}
	aria-pressed={locked}
	title={locked ? `Locked — ${label}. Click to unlock.` : `Lock as ${label}`}
	onclick={(e) => {
		e.stopPropagation();
		onToggle(!locked);
	}}
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<rect x="5" y="11" width="14" height="10" rx="2" />
		{#if locked}
			<path d="M8 11V7a4 4 0 0 1 8 0v4" />
			<circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
		{:else}
			<path d="M8 11V7a4 4 0 0 1 7.6-1.7" />
		{/if}
	</svg>
</button>

<style>
	.lock {
		width: var(--s);
		height: var(--s);
		border-radius: 50%;
		border: 1px solid transparent;
		background: transparent;
		color: var(--faint);
		display: inline-grid;
		place-items: center;
		cursor: pointer;
		padding: 0;
		flex: none;
		transition: background-color 0.12s, color 0.12s, border-color 0.12s;
	}
	.lock svg {
		width: calc(var(--s) * 0.58);
		height: calc(var(--s) * 0.58);
	}
	.lock:hover {
		color: var(--sage-deep);
		background: var(--sage-soft);
	}
	.lock.locked {
		color: var(--sage-deep);
		background: var(--sage-soft);
		border-color: var(--sage);
	}
	.lock.locked:hover {
		color: var(--terra);
		background: var(--terra-bg);
		border-color: var(--terra-bg);
	}
	.lock:focus-visible {
		outline: 2px solid var(--sage);
		outline-offset: 1px;
	}
</style>
