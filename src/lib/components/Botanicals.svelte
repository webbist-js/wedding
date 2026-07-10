<script lang="ts">
	// Decorative wildflower border, grounded full-width along the bottom edge
	// of a section — a faint "meadow" behind footer content. The line art is
	// drawn on white, so mix-blend-mode:multiply drops the white and leaves
	// only the drawing against the cream background.
	//
	// Drop inside any element that is `position: relative` and
	// `isolation: isolate` — the layer sits at z-index -1 so in-flow content
	// paints above it without needing its own z-index.
	let { opacity = 0.24 }: { opacity?: number } = $props();
</script>

<div class="botanicals" aria-hidden="true" style="--o:{opacity}"></div>

<style>
	.botanicals {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: -1;
		aspect-ratio: 1785 / 410;
		background: url('/flora/botanical-border.png') center bottom / contain no-repeat;
		mix-blend-mode: multiply;
		opacity: var(--o);
		pointer-events: none;
	}
</style>
