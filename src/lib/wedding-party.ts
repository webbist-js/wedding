// The wedding party, introduced as couples — every member of Katie & Alex's
// party comes as a pair, so the page tells each couple's story rather than
// listing names. Derived from the guest list (src/lib/server/db/data.ts):
// people carrying a `role` of Best Man / Man of Honour / Groomsman / Bridesmaid,
// grouped by their shared `inviteGroup`.
//
// Copy is placeholder for now. Portraits use picsum.photos seeds as stand-ins
// until real photographs are added — swap `photo` for a local asset path later.

export interface PartyMember {
	name: string;
	role: string; // Best Man, Man of Honour, Groomsman, Bridesmaid
	photo: string; // placeholder portrait — replace with a real image path later
	focus?: string; // object-position for the crop (e.g. 'center 30%')
}

export interface PartyCouple {
	id: string;
	side: 'bride' | 'groom';
	/** True for the Best Man / Man of Honour couples — given a larger spread. */
	lead?: boolean;
	members: [PartyMember, PartyMember]; // [groom-side member, bride-side member] visually
	/** Short, warm narrative tying the couple to Katie & Alex. */
	story: string;
	/** A small kicker shown above their names — how the couple is known. */
	tagline: string;
}

// Deterministic placeholder portraits. The seed keeps each face stable between
// reloads; the 4:5 ratio matches the framed portrait styling on the page.
const portrait = (seed: string) => `https://picsum.photos/seed/${seed}/640/800`;

export const PARTY_INTRO =
	"Here's the funny thing about our wedding party: every single one of them comes as a pair — and " +
	"we've been lucky enough to dance at all of their weddings. After twelve years together, we've " +
	"decided it's finally our turn to return the favour. These are the people we love most, two by two.";

export const PARTY_OUTRO =
	"We've toasted, cried and worn out the dance floor at every one of your weddings. Thank you for " +
	'letting us throw one of our own at last — and for standing beside us while we do.';

export interface RingBearer {
	name: string;
	role: string;
	age: number;
	breed: string;
	photo: string; // placeholder dog portrait — swap for a real photo of Bodie later
	tagline: string;
	story: string;
}

// Bodie — the most important four-legged member of the family. Real photo.
export const RING_BEARER: RingBearer = {
	name: 'Bodie',
	role: 'Ring Bearer',
	age: 8,
	breed: 'Pembroke Welsh Corgi',
	photo: '/party/bodie.jpg',
	tagline: 'The good boy with the most important job',
	story:
		"We've decided that our family is, quite happily, just the two of us — and Bodie. Eight years " +
		'old, endlessly waggy and a corgi of impeccable (if short-legged) character, he is the only baby ' +
		"we'll ever need, and we wouldn't have it any other way. So it felt only right that the most " +
		'important job of the day goes to him: carrying our rings down the aisle. Please forgive him in ' +
		'advance if he is briefly distracted by a stray canapé.'
};

export const WEDDING_PARTY: PartyCouple[] = [
	{
		id: 'bennett',
		side: 'groom',
		lead: true,
		tagline: 'The brother & the right hand',
		members: [
			{ name: 'Chris Bennett', role: 'Best Man', photo: '/party/chris-bennett.png', focus: 'center 28%' },
			{ name: 'Hayley Bennett', role: 'Bridesmaid', photo: '/party/hayley-bennett.png', focus: 'center 24%' }
		],
		story:
			"Alex's older brother and the easiest 'yes' of the whole party. Chris has been Alex's first " +
			'phone call for thirty-odd years — co-conspirator, voice of reason, occasional voice of ' +
			'unreason. Hayley joined the family and somehow made it calmer; together with baby Theo they ' +
			'are the proof that the good kind of chaos is worth it. The rings are Bodie\'s responsibility, ' +
			'so Chris has only the speech to worry about — and he promises to keep it short.'
	},
	{
		id: 'seaton-shaw',
		side: 'bride',
		lead: true,
		tagline: "Katie's oldest friend & his better half",
		members: [
			{ name: 'Adam Seaton Shaw', role: 'Man of Honour', photo: portrait('adam-seaton-shaw') },
			{ name: 'Lysanne Seaton Shaw', role: 'Bridesmaid', photo: portrait('lysanne-seaton-shaw') }
		],
		story:
			"Adam has been Katie's friend since their school days — keeper of every secret and the first " +
			'name on the list for any big decision (this one included). Lysanne brings the warmth and the ' +
			'wit, and the two of them are the kind of couple you leave a dinner party still quoting. Man of ' +
			'Honour was never really in question.'
	},
	{
		id: 'philips',
		side: 'groom',
		tagline: 'School friends, basically family',
		members: [
			{ name: 'Kiran Philips', role: 'Groomsman', photo: '/party/kiran-philips.jpg', focus: 'center 28%' },
			{ name: 'Elisa Philips', role: 'Bridesmaid', photo: '/party/elisa-philips.jpg', focus: 'center 22%' }
		],
		story:
			'Alex and Kiran go all the way back to school — a friendship measured in decades and in-jokes ' +
			"no one else quite understands. Elisa slid straight into the gang as though she'd always been " +
			'there, and these days the four of us are rarely apart for long.'
	},
	{
		id: 'brierley',
		side: 'groom',
		tagline: 'Way back, and here for good',
		members: [
			{ name: 'Oliver Brierley', role: 'Groomsman', photo: '/party/oliver-brierley.png', focus: 'center 28%' },
			{ name: 'Pheobe Brierley', role: 'Bridesmaid', photo: '/party/pheobe-brierley.png', focus: 'center 25%' }
		],
		story:
			'Oli is another of Alex\'s school friends — proof that the best ones stick around. Pheobe joined ' +
			'the fold and instantly made it better. Somewhere along the line this whole crew became the ' +
			'sort that does everything together; we wouldn\'t have it any other way.'
	},
	{
		id: 'todd',
		side: 'groom',
		tagline: 'The pair we adopted on sight',
		members: [
			{ name: 'Chris Todd', role: 'Groomsman', photo: '/party/chris-todd.png', focus: 'center 30%' },
			{ name: 'Jen Todd', role: 'Bridesmaid', photo: '/party/jen-todd.png', focus: 'center 22%' }
		],
		story:
			'We met Chris and Jen through Kiran and clicked within the hour — one of those rare couples who ' +
			'feel like old friends straight away. They have been firmly part of the furniture (and every ' +
			'group trip) ever since.'
	}
];
