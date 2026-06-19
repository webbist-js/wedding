// Shared music store — one audio element, multiple UI surfaces (floating chip
// in the layout, prominent banner on the RSVP page) reading from the same
// reactive state.

class MusicState {
	playing = $state(false);
	available = $state(true);
}

export const music = new MusicState();

let audioRef: HTMLAudioElement | null = null;
let gestureArmed = false;
const KEY = 'wedding-music';

export function attachAudio(el: HTMLAudioElement) {
	if (audioRef) return; // only the first mounted player owns the audio
	audioRef = el;
	audioRef.volume = 0.5;
	audioRef.addEventListener('error', () => (music.available = false));

	if (typeof localStorage === 'undefined') return;
	const stored = localStorage.getItem(KEY);
	if (stored === 'off') return;
	audioRef
		.play()
		.then(() => (music.playing = true))
		.catch(() => armGestureTrigger());
}

function armGestureTrigger() {
	if (gestureArmed) return;
	gestureArmed = true;
	const events = ['pointerdown', 'keydown', 'touchstart'] as const;
	const start = () => {
		if (!gestureArmed) return;
		gestureArmed = false;
		for (const ev of events) document.removeEventListener(ev, start);
		audioRef
			?.play()
			.then(() => (music.playing = true))
			.catch(() => {
				/* still blocked; user can tap the player */
			});
	};
	for (const ev of events) document.addEventListener(ev, start, { passive: true });
}

export function toggleMusic() {
	if (!audioRef) return;
	if (music.playing) {
		audioRef.pause();
		music.playing = false;
		try {
			localStorage.setItem(KEY, 'off');
		} catch {
			/* private mode */
		}
	} else {
		audioRef
			.play()
			.then(() => {
				music.playing = true;
				try {
					localStorage.setItem(KEY, 'on');
				} catch {
					/* private mode */
				}
			})
			.catch(() => (music.available = false));
	}
}
