<script lang="ts">
	// Side-edge botanical frame — sprigs scattered along the page margins, naturally
	// oriented (no flips). Fixed to the viewport so the framing rides along as
	// guests scroll; pointer-events: none so it never blocks interaction.
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

	/* Left edge — vertical scatter, slight outward tilts */
	.l1 {
		left: 1%;
		top: 2vh;
		width: 110px;
		transform: rotate(-10deg);
	}
	.l2 {
		left: 0%;
		top: 32vh;
		width: 110px;
		transform: rotate(-18deg);
	}
	.l3 {
		left: 2%;
		top: 60vh;
		width: 80px;
		transform: rotate(12deg);
	}
	.l4 {
		left: 0%;
		bottom: 4vh;
		width: 110px;
		transform: rotate(-8deg);
	}

	/* Right edge — mirrored */
	.r1 {
		right: 1%;
		top: 4vh;
		width: 100px;
		transform: scaleX(-1) rotate(-8deg);
	}
	.r2 {
		right: 1%;
		top: 28vh;
		width: 110px;
		transform: scaleX(-1) rotate(-12deg);
	}
	.r3 {
		right: 2%;
		top: 58vh;
		width: 100px;
		transform: scaleX(-1) rotate(10deg);
	}
	.r4 {
		right: 0%;
		bottom: 6vh;
		width: 100px;
		transform: scaleX(-1) rotate(-10deg);
	}

	/* Hide on narrow viewports so flora doesn't crowd the content */
	@media (max-width: 900px) {
		.flora-frame img {
			width: 80px !important;
			opacity: 0.4;
		}
	}
	@media (max-width: 640px) {
		.l2,
		.r2,
		.l3,
		.r3 {
			display: none;
		}
		.flora-frame img {
			width: 70px !important;
			opacity: 0.38;
		}
	}
</style>
