<script lang="ts">
	// The couple's names rendered like the homepage hero title: "Katie" in
	// bold serif above an italic "Alex", joined by the flowing Style Script
	// swash ampersand. Colour is inherited from the surrounding context, so
	// the mark reads correctly on both light and dark backgrounds.
	//
	// layout="stacked" (default) — two lines, for footers / page headings.
	// layout="inline"          — one line, for tight spots like the dashboard bar.
	let {
		first = 'Katie',
		second = 'Alex',
		layout = 'stacked'
	}: { first?: string; second?: string; layout?: 'stacked' | 'inline' } = $props();
</script>

{#if layout === 'inline'}
	<span class="couple inline">{first} <span class="amp">&amp;</span> {second}</span>
{:else}
	<span class="couple stacked">
		<span class="cn-line">{first}</span>
		<span class="cn-line cn-line2"><span class="amp">&amp;</span>{second}</span>
	</span>
{/if}

<style>
	.couple {
		font-family: var(--serif);
		color: inherit;
		letter-spacing: -0.02em;
	}
	.stacked {
		display: inline-block;
		font-weight: 600;
		line-height: 0.9;
	}
	.cn-line {
		display: block;
	}
	.cn-line2 {
		font-style: italic;
		font-weight: 500;
	}
	.inline {
		font-weight: 600;
	}
	.amp {
		font-family: var(--script-amp);
		font-style: normal;
		font-weight: 400;
		font-size: 0.85em;
	}
	/* Butt the swash right up against "Alex" on the stacked lockup, matching
	   the hero title; keep breathing room on the inline variant. */
	.stacked .amp {
		margin-right: -0.01em;
	}
</style>
