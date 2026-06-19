<script lang="ts">
	// Side-edge botanical frame — sprigs scattered along the page margins, rendered
	// at their native exported sizes (no widths or rotations applied). Fixed to the
	// viewport so the framing rides along as guests scroll; pointer-events: none
	// so it never blocks interaction.
	//
	// `side`: 'both' (default) frames both edges; 'left' is used by the RSVP page
	// so sprigs never bleed into the right-hand form panel.
	let {
		density = 'normal' as 'sparse' | 'normal',
		side = 'both' as 'both' | 'left'
	} = $props();
</script>

<div class="flora-frame" data-density={density} data-side={side} aria-hidden="true">
	<!-- left edge -->
	<img src="/flora/layer-11.png" alt="" class="l1" />
	<img src="/flora/layer-9.png" alt="" class="l2" />
	<img src="/flora/layer-14.png" alt="" class="l3" />
	<img src="/flora/layer-17.png" alt="" class="l4" />
	{#if side === 'both'}
		<!-- right edge -->
		<img src="/flora/layer-12.png" alt="" class="r1" />
		<img src="/flora/layer-18.png" alt="" class="r2" />
		<img src="/flora/layer-16.png" alt="" class="r3" />
		<img src="/flora/layer-15.png" alt="" class="r4" />
	{/if}
</div>

<style>
	.flora-frame {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}
	.flora-frame img {
		position: absolute;
		opacity: 0.55;
		user-select: none;
	}
	[data-density='sparse'] img {
		opacity: 0.4;
	}

	/* Left edge — vertical scatter, native sizes */
	.l1 {
		left: 0;
		top: 2vh;
	}
	.l2 {
		left: 0;
		top: 32vh;
	}
	.l3 {
		left: 0;
		top: 60vh;
	}
	.l4 {
		left: 0;
		bottom: 4vh;
	}

	/* Right edge */
	.r1 {
		right: 0;
		top: 4vh;
	}
	.r2 {
		right: 0;
		top: 28vh;
	}
	.r3 {
		right: 0;
		top: 58vh;
	}
	.r4 {
		right: 0;
		bottom: 6vh;
	}

	@media (max-width: 640px) {
		.l2,
		.r2,
		.l3,
		.r3 {
			display: none;
		}
		.flora-frame img {
			opacity: 0.4;
		}
	}
</style>
