// Svelte action: fade-and-rise an element into view when it scrolls into the viewport.
// Pair with the `.reveal` / `.revealed` CSS in app.css.
//
// Respects prefers-reduced-motion by skipping the animation and revealing immediately.

export interface RevealOptions {
	delay?: number; // ms before adding the revealed class once intersecting
	threshold?: number; // intersection ratio threshold
	once?: boolean; // disconnect after first reveal (default true)
}

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	const reduced =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	if (reduced || typeof IntersectionObserver === 'undefined') {
		node.classList.add('revealed');
		return {};
	}

	node.classList.add('reveal');
	const { delay = 0, threshold = 0.12, once = true } = options;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					if (delay) {
						setTimeout(() => node.classList.add('revealed'), delay);
					} else {
						node.classList.add('revealed');
					}
					if (once) observer.unobserve(node);
				} else if (!once) {
					node.classList.remove('revealed');
				}
			}
		},
		{ threshold }
	);
	observer.observe(node);

	return {
		destroy: () => observer.disconnect()
	};
}
