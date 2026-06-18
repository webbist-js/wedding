<script lang="ts">
	// Decorative botanical sprigs — purely presentational. Each `placement` arranges
	// a few of the watercolour assets along an edge, like the Save the Date design.
	let { placement = 'top' as 'top' | 'bottom' | 'sides', density = 'normal' as 'sparse' | 'normal' } = $props();
</script>

<div class="flora flora-{placement}" data-density={density} aria-hidden="true">
	{#if placement === 'top'}
		<img src="/flora/layer-14-1.png" alt="" class="f1" />
		<img src="/flora/layer-11.png" alt="" class="f2" />
		<img src="/flora/layer-18.png" alt="" class="f3" />
		<img src="/flora/layer-12.png" alt="" class="f4" />
		<img src="/flora/layer-15.png" alt="" class="f5" />
	{:else if placement === 'bottom'}
		<img src="/flora/layer-9.png" alt="" class="f1" />
		<img src="/flora/layer-11-1.png" alt="" class="f2" />
		<img src="/flora/layer-13.png" alt="" class="f3" />
		<img src="/flora/layer-16.png" alt="" class="f4" />
		<img src="/flora/layer-17.png" alt="" class="f5" />
	{:else}
		<img src="/flora/layer-9-1.png" alt="" class="s1" />
		<img src="/flora/layer-10.png" alt="" class="s2" />
		<img src="/flora/layer-14.png" alt="" class="s3" />
	{/if}
</div>

<style>
	.flora {
		position: absolute;
		left: 0;
		right: 0;
		pointer-events: none;
		z-index: 0;
	}
	.flora img {
		position: absolute;
		opacity: 0.6;
		user-select: none;
	}
	.flora[data-density='sparse'] img {
		opacity: 0.45;
	}

	.flora-top {
		top: 0;
		height: 180px;
	}
	.flora-bottom {
		bottom: 0;
		height: 180px;
		transform: scaleY(-1);
	}

	/* Top arrangement — sprigs hanging down from the top edge */
	.flora-top .f1 {
		left: 4%;
		top: -10px;
		width: 80px;
		transform: rotate(-12deg);
	}
	.flora-top .f2 {
		left: 22%;
		top: -20px;
		width: 100px;
		transform: rotate(-4deg);
	}
	.flora-top .f3 {
		left: 48%;
		top: -8px;
		width: 80px;
		transform: rotate(8deg);
	}
	.flora-top .f4 {
		left: 70%;
		top: -16px;
		width: 70px;
		transform: rotate(-10deg);
	}
	.flora-top .f5 {
		right: 4%;
		top: -10px;
		width: 90px;
		transform: rotate(12deg) scaleX(-1);
	}

	/* Bottom arrangement — sprigs rising from the bottom (flipped via scaleY parent) */
	.flora-bottom .f1 {
		left: 6%;
		top: 10px;
		width: 80px;
		transform: rotate(-8deg);
	}
	.flora-bottom .f2 {
		left: 26%;
		top: 0;
		width: 90px;
	}
	.flora-bottom .f3 {
		left: 50%;
		top: 14px;
		width: 70px;
		transform: rotate(8deg);
	}
	.flora-bottom .f4 {
		left: 70%;
		top: 0;
		width: 100px;
		transform: rotate(-6deg);
	}
	.flora-bottom .f5 {
		right: 6%;
		top: 8px;
		width: 80px;
		transform: rotate(10deg) scaleX(-1);
	}

	.flora-sides {
		position: fixed;
		inset: 0;
		height: 100vh;
	}
	.flora-sides .s1 {
		left: 2%;
		top: 18vh;
		width: 90px;
		transform: rotate(-25deg);
	}
	.flora-sides .s2 {
		right: 2%;
		top: 30vh;
		width: 110px;
		transform: rotate(15deg) scaleX(-1);
	}
	.flora-sides .s3 {
		right: 4%;
		bottom: 12vh;
		width: 70px;
		transform: rotate(-15deg);
	}

	/* Smaller scale on narrow screens so the sprigs don't crowd the page */
	@media (max-width: 640px) {
		.flora-top,
		.flora-bottom {
			height: 130px;
		}
		.flora-top img,
		.flora-bottom img {
			transform-origin: center;
			width: 60px !important;
		}
		.flora-top .f2,
		.flora-bottom .f4 {
			width: 75px !important;
		}
		.flora-sides {
			display: none;
		}
	}
</style>
