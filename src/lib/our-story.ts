// Narrative content for the redesigned homepage — Katie & Alex's journey, told as
// chapters with alternating editorial spreads. Copy and photography are
// placeholders for now; swap `image` paths for real photos of the two of them.

export interface StoryChapter {
	index: string; // "01"
	kicker: string; // small label above the title
	title: string;
	year: string;
	body: string;
	image: string; // placeholder — replace with a real photo
	align: 'left' | 'right'; // which side the image sits on (desktop)
	focus?: string; // object-position for the crop (e.g. 'center 30%')
}

export const HERO_IMAGE = '/story/hero.jpg';
export const HERO_FOCUS = 'center 30%';

// The big statement that fades in beneath the hero.
export const STORY_STATEMENT =
	'A love story is really just a collection of ordinary days that quietly add up to ' +
	'everything. This is a little of ours — and an invitation to be part of the next chapter.';

export const STORY_CHAPTERS: StoryChapter[] = [
	{
		index: '01',
		kicker: 'How we met',
		title: 'Where it began',
		year: '2015',
		body:
			'We met the modern way — on a dating app — though this was back before Tinder even existed, ' +
			'which makes us either early adopters or simply impatient. We hit it off almost at once: ' +
			"hanging out more and more, the introduction to Alex's friends, the first of many holidays. " +
			"Somewhere along the way we became each other's best friend — same daft humour, same odd " +
			'little obsessions — until we genuinely could not imagine life without the other.',
		image: '/story/met.png',
		focus: 'center 32%',
		align: 'right'
	},
	{
		index: '02',
		kicker: 'The best decision',
		title: 'Then came Bodie',
		year: '2018',
		body:
			'Long before the house or the ring, there was a small ginger corgi with enormous ears and even ' +
			'bigger opinions. Bodie bounded into our lives in 2018 and promptly took charge of both of us — ' +
			'the walks, the sofa, the schedule. He has been our shadow ever since, and on the day he lands ' +
			'the most important job of all: ring bearer.',
		image: '/story/bodie-puppy.jpg',
		focus: 'center 35%',
		align: 'left'
	},
	{
		index: '03',
		kicker: 'Our first home',
		title: 'Somewhere to call ours',
		year: '2023',
		body:
			'Then came the keys to a little house of our own — too many paint swatches, a kitchen we are ' +
			'still arguing about, and a garden that Bodie has firmly claimed as his kingdom. It is unfinished ' +
			'and imperfect and entirely, wonderfully ours.',
		image: '/story/home.png',
		focus: 'center 42%',
		align: 'right'
	},
	{
		index: '04',
		kicker: 'The proposal',
		title: 'The question',
		year: '2025',
		body:
			'It happened in Colmar, in the fairy-tale heart of Alsace. A private driver wound them up to the ' +
			"Château du Haut-Kœnigsbourg for a day among turrets and vineyards, then back to L'Esquisse Hôtel " +
			'for their first-ever Michelin-starred dinner and quiet cocktails at the bar. It was there, at the ' +
			'hotel — before they crossed the border into Switzerland — that Alex finally asked. Katie said yes.',
		image: '/story/proposal.jpg',
		align: 'left'
	}
];

export interface FutureWish {
	index: string;
	year: string;
	kicker: string; // short witty label shown beside the year
	title: string;
	body: string;
	image: string;
	focus?: string;
	align: 'left' | 'right';
}

// "What comes next" — an entirely fictional plan that gets a little more ambitious
// every year. Strictly non-binding.
export const WISHES_INTRO =
	'And after the wedding? We have a plan. It gets a little more ambitious every year — ' +
	'wildly unrealistic, strictly non-binding, and (we are fairly sure) entirely inevitable.';

export const FUTURE_WISHES: FutureWish[] = [
	{
		index: '01',
		year: '2031',
		kicker: 'Naturalised',
		title: 'Became Swiss',
		body:
			'We move to the Alps, master the dark art of fondue, learn to ski without falling over and — ' +
			'after the obligatory decade of paperwork — become proud Swiss citizens. Two red passports, one ' +
			'mountain chalet, and a very smug corgi in a tiny barrel.',
		image: '/story/wish-switzerland.png',
		focus: 'center 45%',
		align: 'right'
	},
	{
		index: '02',
		year: '2033',
		kicker: 'Off-world',
		title: 'A window seat in orbit',
		body:
			'We become some of the first ordinary people to see the curve of the Earth from space. ' +
			'Commercial tickets, window seats only, snacks freeze-dried. Bodie supervises the launch from ' +
			'the back garden and declines, on principle, to be impressed.',
		image: '/story/wish-space.png',
		focus: 'center 40%',
		align: 'left'
	},
	{
		index: '03',
		year: '2034',
		kicker: 'Quite by accident',
		title: 'Crowned by mistake',
		body:
			'On a completely normal holiday, Alex pulls a ceremonial sword from a stone while hunting for a ' +
			'geocache. After a flurry of legal disputes and one unfortunate loophole in international law, we ' +
			'are crowned King and Queen of a small European nation. We now spend our days opening ' +
			'supermarkets and waving from balconies.',
		image: '/story/wish-monarchy.png',
		focus: 'center 35%',
		align: 'right'
	},
	{
		index: '04',
		year: '2037',
		kicker: 'The first windfall',
		title: 'Won the lottery. Twice.',
		body:
			'We win the lottery. Then, because the first time felt like beginner\'s luck, we win it again ' +
			'the following week. The surprised faces are now thoroughly rehearsed, the novelty cheque is on ' +
			'its third reprint, and the first win is earmarked for more dog treats than is strictly sensible.',
		image: '/story/wish-lottery.jpg',
		focus: 'center 40%',
		align: 'left'
	}
];
