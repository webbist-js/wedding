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
	<!-- left edge — six sprigs, each rotated 45° clockwise around their bottom-left
	     corner so the base sits on the panel edge and the foliage grows up-and-right
	     into the page. -->
	<img src="/flora/layer-11.png" alt="" class="l1" />
	<img src="/flora/layer-9.png" alt="" class="l2" />
	<img src="/flora/layer-15.png" alt="" class="l3" />
	<img src="/flora/layer-18.png" alt="" class="l4" />
	<img src="/flora/layer-10.png" alt="" class="l5" />
	<img src="/flora/layer-13.png" alt="" class="l6" />
	{#if side === 'both'}
		<!-- right edge — mirrored, drawn from the same 8-image set -->
		<img src="/flora/layer-16.png" alt="" class="r1" />
		<img src="/flora/layer-18.png" alt="" class="r2" />
		<img src="/flora/layer-9-1.png" alt="" class="r3" />
		<img src="/flora/layer-9.png" alt="" class="r4" />
		<img src="/flora/layer-10.png" alt="" class="r5" />
		<img src="/flora/layer-15.png" alt="" class="r6" />
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

	/* Left edge — six sprigs at 50% of their native size, rotated 45° so they look
	   like they're growing out of the panel edge into the page. */
	.flora-frame [class^='l'] {
		left: 0;
		transform-origin: 0 100%;
		transform: rotate(45deg);
	}
	.l1 { top: 4vh;  width: 135px; }
	.l2 { top: 20vh; width: 88px;  }
	.l3 { top: 38vh; width: 118px; }
	.l4 { top: 56vh; width: 118px; }
	.l5 { top: 74vh; width: 103px; }
	.l6 { top: 90vh; width: 104px; }

	/* Right edge — mirrored: anchored at bottom-right, rotated -45° */
	.flora-frame [class^='r'] {
		right: 0;
		transform-origin: 100% 100%;
		transform: rotate(-45deg);
	}
	.r1 { top: 4vh;  width: 111px; }
	.r2 { top: 20vh; width: 118px; }
	.r3 { top: 38vh; width: 86px;  }
	.r4 { top: 56vh; width: 88px;  }
	.r5 { top: 74vh; width: 103px; }
	.r6 { top: 90vh; width: 118px; }

	@media (max-width: 640px) {
		.l2, .l4, .l6, .r2, .r4, .r6 { display: none; }
		.flora-frame img { opacity: 0.4; }
	}
</style>
