// Shared scroll experience for the public pages: Lenis smooth scrolling plus a
// lightweight reveal + parallax engine driven by the window scroll position.
//
// - initSmoothScroll(): start Lenis (call once, e.g. from the public layout).
// - enhance(root): wire up [data-reveal] fade-rises and [data-speed] parallax
//   for everything inside `root`. Returns a cleanup function.
//
// Both are no-ops under prefers-reduced-motion and on the server.

export function initSmoothScroll(): () => void {
	if (typeof window === 'undefined') return () => {};
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

	let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
	let rafId = 0;
	let running = true;

	(async () => {
		const mod = await import('lenis');
		const Lenis = mod.default;
		lenis = new Lenis({
			duration: 1.35,
			smoothWheel: true,
			easing: (t: number) => 1 - Math.pow(1 - t, 3)
		}) as unknown as typeof lenis;
		const loop = (time: number) => {
			if (!running) return;
			lenis!.raf(time);
			rafId = requestAnimationFrame(loop);
		};
		rafId = requestAnimationFrame(loop);
	})();

	return () => {
		running = false;
		cancelAnimationFrame(rafId);
		lenis?.destroy();
	};
}

export function enhance(root: HTMLElement): () => void {
	if (typeof window === 'undefined') return () => {};
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---- Reveals ----
	const revealEls = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
	if (reduce) {
		revealEls.forEach((n) => n.classList.add('in'));
		return () => {};
	}
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					e.target.classList.add('in');
					io.unobserve(e.target);
				}
			}
		},
		{ threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
	);
	revealEls.forEach((n) => io.observe(n));

	// ---- Parallax ----
	const pEls = Array.from(root.querySelectorAll<HTMLElement>('[data-speed]')).map((n) => ({
		n,
		speed: parseFloat(n.dataset.speed || '0'),
		center: 0
	}));

	let raf = 0;
	let queued = false;

	function measure() {
		for (const p of pEls) p.n.style.transform = '';
		const sy = window.scrollY;
		for (const p of pEls) {
			const r = p.n.getBoundingClientRect();
			p.center = r.top + sy + r.height / 2;
		}
		apply();
	}
	function apply() {
		const mid = window.scrollY + window.innerHeight / 2;
		for (const p of pEls) {
			const d = p.center - mid;
			p.n.style.transform = `translate3d(0, ${(-d * p.speed).toFixed(2)}px, 0)`;
		}
	}
	function onScroll() {
		if (queued) return;
		queued = true;
		raf = requestAnimationFrame(() => {
			queued = false;
			apply();
		});
	}

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', measure);
	window.addEventListener('load', measure);
	measure();

	return () => {
		io.disconnect();
		cancelAnimationFrame(raf);
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', measure);
		window.removeEventListener('load', measure);
	};
}
