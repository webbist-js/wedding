// "Whinfell Hallelujah": the Vol. 03 sing-along. Lyrics as written for Suno:
// static/audio/whinfell-hallelujah.txt. Line timings come from aligning those
// lyrics against a word-level transcription of the track (faster-whisper,
// medium.en), so each line starts when it's actually sung.
import timing from './whinfell-hallelujah-timing.json';

export type Voice = 'lead' | 'choir' | 'rap' | 'alto';
export type ChoirLine = {
	start: number;
	end: number;
	/** What's sung. */
	text: string;
	/** The choir's answer on the same line, e.g. "WE'RE GOING! (WE'RE GOING!)". */
	reply?: string;
	/** The whole line is the choir answering the leader. */
	echo?: boolean;
	/** Song section: Intro, Verse 1, Chorus, Rap break… */
	part: string;
	voice: Voice;
};

export const HALLELUJAH = {
	title: 'Whinfell Hallelujah',
	artist: 'The Stendo Forest Choir',
	src: '/audio/whinfell-hallelujah.mp3',
	video: '/video/stendo-forest-choir.mp4?v=2',
	duration: 225.98,
	lines: timing as ChoirLine[]
};

export const VOICE_LABEL: Record<Voice, string> = { lead: 'Leader', choir: 'Choir', rap: 'Rapper', alto: 'Alto' };
