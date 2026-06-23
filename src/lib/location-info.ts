// Static content for the location / "the area" page. Copy is placeholder-quality
// but factually grounded; travel times from the Tithe Barn (Bolton Abbey) are
// approximate. Photography is from Wikimedia Commons — see IMAGE_CREDITS, which
// satisfies the CC BY / BY-SA attribution requirements rendered on the page.

export interface Attraction {
	slug: string;
	image: string; // path under /location
	name: string;
	distance: string; // approx travel from the venue
	body: string;
	link?: { label: string; href: string };
}

export const VENUE = {
	name: 'The Tithe Barn',
	estate: 'Bolton Abbey · Yorkshire Dales',
	lead: 'A restored stone barn on the Bolton Abbey estate.',
	body:
		"We're marrying at the Tithe Barn — a beautifully restored barn set on the Duke of Devonshire's " +
		'Bolton Abbey estate, deep in the Yorkshire Dales. Think honey-coloured stone, soaring oak beams ' +
		'and candlelight, with the River Wharfe and the priory ruins a short stroll away. It is, we think, ' +
		'one of the loveliest corners of the North — and we cannot wait to share it with you.',
	heroImage: '/location/venue-hero.jpg',
	bandImage: '/location/venue-bolton-abbey.jpg'
};

export const AREA_INTRO =
	"Bolton Abbey sits right on the edge of the Yorkshire Dales and Brontë Country — a part of the world " +
	"made for a slow weekend. If you're travelling to be with us, here are a few of our favourite things " +
	"to see and do while you're here.";

export const ATTRACTIONS: Attraction[] = [
	{
		slug: 'bolton-abbey',
		image: '/location/abbey-stepping-stones.jpg',
		name: 'Bolton Abbey',
		distance: 'On the doorstep',
		body:
			'The 12th-century priory ruins sit beside the River Wharfe, with the famous stepping stones to ' +
			'tiptoe across and miles of riverside and woodland walks through Strid Wood. Bring boots — and ' +
			'a sense of adventure for the stones.',
		link: { label: 'boltonabbey.com', href: 'https://www.boltonabbey.com/' }
	},
	{
		slug: 'haworth',
		image: '/location/bronte-parsonage.jpg',
		name: 'Brontë Country & Haworth',
		distance: 'About 40 minutes',
		body:
			"The cobbled hill village the Brontë sisters called home. Wander Main Street's bookshops and " +
			'tea rooms, then visit the Brontë Parsonage Museum where Charlotte, Emily and Anne wrote their ' +
			'novels.',
		link: { label: 'bronte.org.uk', href: 'https://www.bronte.org.uk/' }
	},
	{
		slug: 'the-moors',
		image: '/location/the-moors.jpg',
		name: 'The Brontë Moors',
		distance: 'Above Haworth',
		body:
			'The wild, windswept moorland that inspired Wuthering Heights. Follow the path out to Top Withens ' +
			'for big skies, heather and the kind of romantic gloom that writes itself.'
	},
	{
		slug: 'skipton',
		image: '/location/skipton-castle.jpg',
		name: 'Skipton',
		distance: 'About 15 minutes',
		body:
			"The 'Gateway to the Dales' — a bustling market town with one of the best-preserved medieval " +
			'castles in England, a four-day-a-week market down the high street, and canal-boat trips along ' +
			'the Leeds & Liverpool.',
		link: { label: 'skiptoncastle.co.uk', href: 'https://www.skiptoncastle.co.uk/' }
	},
	{
		slug: 'ilkley',
		image: '/location/ilkley-cow-calf.jpg',
		name: 'Ilkley & the Cow and Calf',
		distance: 'About 20 minutes',
		body:
			'A handsome Victorian spa town beneath Ilkley Moor — of folk-song fame. Climb up to the Cow and ' +
			'Calf, a pair of dramatic gritstone rocks with views right across Wharfedale, then reward ' +
			'yourself with tea and cake in town.'
	},
	{
		slug: 'steam-railway',
		image: '/location/steam-railway.jpg',
		name: 'Embsay & Bolton Abbey Steam Railway',
		distance: 'About 10 minutes',
		body:
			'A lovingly run heritage line where restored steam engines puff through the dale between Embsay ' +
			'and Bolton Abbey. A gentle, nostalgic morning out — and a hit with younger guests.',
		link: {
			label: 'embsayboltonabbeyrailway.org.uk',
			href: 'https://www.embsayboltonabbeyrailway.org.uk/'
		}
	}
];

export const AREA_OUTRO = {
	image: '/location/wharfedale.jpg',
	text:
		'However long you can stay, we hope you fall a little in love with this corner of Yorkshire — ' +
		'just as we have.'
};

export interface ImageCredit {
	subject: string;
	artist: string;
	license: string;
	page: string;
}

// Attribution for the Wikimedia Commons photography used on this page.
export const IMAGE_CREDITS: ImageCredit[] = [
	{ subject: 'The ruins of Bolton Abbey', artist: 'Michael D Beckwith', license: 'CC0', page: 'https://commons.wikimedia.org/w/index.php?curid=80329154' },
	{ subject: 'Stepping stones at Bolton Abbey', artist: 'Tim Green', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/w/index.php?curid=92955022' },
	{ subject: 'Brontë Parsonage, Haworth', artist: 'DeFacto', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/w/index.php?curid=43448375' },
	{ subject: 'Path across the moor, Haworth', artist: 'Tim Green', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/w/index.php?curid=51918547' },
	{ subject: 'Skipton Castle', artist: 'Mark L MacDonald', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/w/index.php?curid=28719815' },
	{ subject: 'Cow and Calf Rocks, Ilkley', artist: 'John Sparshatt', license: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/w/index.php?curid=115630241' },
	{ subject: 'Embsay & Bolton Abbey Steam Railway', artist: 'Chris Morgan', license: 'CC BY-SA 2.0', page: 'https://commons.wikimedia.org/w/index.php?curid=125336754' },
	{ subject: 'Wharfedale', artist: 'Robert J Heath', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/w/index.php?curid=182986326' }
];
