// "Our People in the Trees" — the Vol. 02 sing-along. Plain lyrics (as pasted
// into Suno): static/audio/our-people-in-the-trees.txt. Line timings are
// PROVISIONAL: spread across the track by syllable count with gaps at the
// instrumental cues, not aligned to the vocal. Replace with a real alignment.
import timing from './our-people-in-the-trees-timing.json';

export type LyricLine = { start: number; end: number; text: string; section: string };

export const SONG = {
	title: 'Our People in the Trees',
	src: '/audio/our-people-in-the-trees.mp3',
	duration: 261.1,
	lyrics: timing as LyricLine[]
};

/** Index of the line being sung at `t`, or -1 between lines. */
export function lineAt(lines: readonly { start: number; end: number }[], t: number): number {
	for (let i = lines.length - 1; i >= 0; i--) if (t >= lines[i].start) return t < lines[i].end ? i : -1;
	return -1;
}

/** Index of the most recent line started at `t` (keeps the last line on screen in gaps). */
export function lastLineAt(lines: readonly { start: number }[], t: number): number {
	for (let i = lines.length - 1; i >= 0; i--) if (t >= lines[i].start) return i;
	return -1;
}
