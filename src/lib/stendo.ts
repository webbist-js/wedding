// The Stendo, Vol. 02 — the Center Parcs pitch (/stendo).
// Content + pure maths only: safe to import on server and client. Persistence
// lives in $lib/server/stendo.ts. Prices were read live from centerparcs.co.uk
// on 9 November 2026 for Fri 19 – Mon 22 March 2027 (Center Parcs weekend
// breaks are always Friday–Monday, three nights). Prices are per lodge, not
// per person, and change daily. See docs/stendo-center-parcs-research.md.

export const CHECKED = '9 November 2026';
export const STAY = { checkIn: '2027-03-19', checkOut: '2027-03-22', nights: 3, couples: 6 } as const;
export const OFFER = 130; // Katie & Alex's top-up, per couple, towards accommodation

export type VillageId = 'sherwood' | 'longleat';
export type LodgeKind = 'own' | 'pair' | 'hub';

/** Center Parcs' own image CDN. Names are stored URL-encoded. */
export const cp = (name: string, width = 1200) =>
	`https://centerparcs.scene7.com/is/image/centerparcs/${name}?qlt=80&wid=${width}`;

export type Lodge = {
	id: string;
	village: VillageId;
	name: string;
	kind: LodgeKind;
	bedrooms: number;
	doubles: number;
	twins: number;
	baths: string;
	features: string[];
	price: number; // whole lodge, 3 nights
	scarce?: string; // "Only 1 left" when we checked
	image: string;
	note?: string;
};

export type Village = {
	id: VillageId;
	name: string;
	county: string;
	postcode: string;
	lat: number;
	lng: number;
	strap: string;
	pitch: string;
	hero: string;
	gallery: { src: string; alt: string }[];
	signature: { title: string; text: string }[];
	activities: { name: string; note: string }[];
	food: { name: string; note: string }[];
	nearby: string;
	searchUrl: string;
};

export const VILLAGES: Record<VillageId, Village> = {
	sherwood: {
		id: 'sherwood',
		name: 'Sherwood Forest',
		county: 'Nottinghamshire',
		postcode: 'NG22 9DN',
		lat: 53.167326,
		lng: -1.05735,
		strap: 'The original. And the closest.',
		pitch: 'The first UK village, in the middle of Robin Hood country. Under two hours from most of us: less time in the car, more time in the hot tub.',
		hero: cp('drone-forest-SF-hero-1', 1800),
		gallery: [
			{ src: cp('Lake-drone-SF-hero-1'), alt: 'The Sherwood Forest village lake from above, ringed by pine forest' },
			{ src: cp('Drone%20Treetop%20Sauna%20SF%206'), alt: 'The treetop sauna at Aqua Sana Sherwood, raised among the trees' },
			{ src: cp('TAG%20CHALLENGE%20ARENA%20SF%20SCHOOL%20AGE%2078'), alt: 'The neon-lit TAG Challenge Arena at Sherwood' }
		],
		signature: [
			{ title: 'The Dozing Duck', text: 'A Sherwood-only gastropub with shuffleboard and crazy pool. Saturday night, sorted.' },
			{ title: 'Treetop sauna', text: 'Aqua Sana’s sauna up in the canopy. Exclusive to Sherwood.' },
			{ title: 'Treetop Glider & TAG Arena', text: 'Zip through the forest, then lose to Chris at a light-up reflex game.' }
		],
		activities: [
			{ name: 'Subtropical Swimming Paradise', note: 'Included. Rapids, slides, wave pool, palm trees in March.' },
			{ name: 'Exclusive Cabana Cove', note: 'A private poolside cabana for 8 — basically a VIP booth.' },
			{ name: 'Ten-pin & Arcade Bowls', note: 'Classic couples-league chaos.' },
			{ name: 'SingPods', note: 'Private karaoke pods. 30 or 60 minutes.' },
			{ name: 'Padel, pickleball & curling', note: 'For the competitive ones.' },
			{ name: 'Laser clay shoot-out & archery', note: 'Point at things. Win points.' },
			{ name: 'Paintball & quad bike safari (16+)', note: 'For the thrill-seekers.' },
			{ name: 'Falconry & owl encounters', note: 'Gentle, brilliant, and the owls will judge you.' },
			{ name: 'Pottery painting & willow workshop', note: 'Paint a mug. Call it art.' },
			{ name: 'Aqua Sana Forest Spa', note: 'Book treatments and spa sessions separately.' }
		],
		food: [
			{ name: 'The Dozing Duck', note: 'Pub classics · shuffleboard · Sherwood only' },
			{ name: 'Las Iguanas', note: 'Latin American · cocktails' },
			{ name: 'Huck’s American Bar & Grill', note: 'Burgers & grills · 3 courses from £25.95' },
			{ name: 'Rajinda Pradesh', note: 'Indian · 3 courses from £25.95' },
			{ name: 'Bella Italia', note: 'Italian · open from noon' },
			{ name: 'Café Rouge', note: 'French bistro · afternoon tea for two' },
			{ name: 'The Pancake House', note: 'Saturday-morning recovery' },
			{ name: 'Restaurant Runner', note: 'Restaurant food delivered to the lodge, 4:30–10pm' }
		],
		nearby: 'Sherwood Forest country park and the Major Oak are minutes away. Nottingham and Newark are about half an hour.',
		searchUrl: 'https://www.centerparcs.co.uk/breaks-we-offer/search.html/2/SF/19-03-2027/3/-/-/1/2/0/0/0/0/N'
	},
	longleat: {
		id: 'longleat',
		name: 'Longleat Forest',
		county: 'Wiltshire',
		postcode: 'BA12 7PU',
		lat: 51.187072,
		lng: -2.231441,
		strap: 'The far one. With escape rooms.',
		pitch: 'Deep in the Longleat estate in Wiltshire: giant redwoods, a lake and the cheapest one-bed apartments of the two. A proper road trip for the Yorkshire contingent.',
		hero: cp('Lake%20Drone%20LF%20July%202021%205-1', 1800),
		gallery: [
			{ src: cp('Giant%20Redwoods%20Drone%20LF%20July%202021%202-1'), alt: 'Giant redwoods towering over Longleat Forest from above' },
			{ src: cp('STSP%20Indoor%20Pool%20Wide%20August%202017%20LF%2001-2'), alt: 'Inside the Subtropical Swimming Paradise dome at Longleat' },
			{ src: cp('Adventure%20Nets%20LF%20June%202025%2096'), alt: 'Adventure nets strung through the trees at Longleat' }
		],
		signature: [
			{ title: 'Locked In A Room', text: 'Two escape rooms (Parallax and TimeLock) for teams of 3–6. Couples vs couples.' },
			{ title: 'Foresters’ Inn', text: 'The village pub, with afternoon tea in the day.' },
			{ title: 'Late Night Lanes', text: 'Grown-up evening bowling, plus glow pool and glow table tennis.' }
		],
		activities: [
			{ name: 'Subtropical Swimming Paradise', note: 'Included. Rapids, slides, wave pool, palm trees in March.' },
			{ name: 'Locked In A Room (×2)', note: 'Escape rooms. Has jump scares.' },
			{ name: 'Late Night Lanes & Arcade Bowls', note: 'Bowling after dark.' },
			{ name: 'Glow English pool & glow table tennis', note: 'Neon pub games.' },
			{ name: 'SingPods', note: 'Private karaoke pods. 30 or 60 minutes.' },
			{ name: 'Adventure Nets & Aerial Adventure', note: 'Bouncing about in the treetops.' },
			{ name: 'Laser clay shoot-out & archery', note: 'Point at things. Win points.' },
			{ name: 'Challenge Golf & pickleball', note: 'For the competitive ones.' },
			{ name: 'Falconry & owl encounters', note: 'Gentle, brilliant, and the owls will judge you.' },
			{ name: 'Aqua Sana Forest Spa', note: 'Book treatments and spa sessions separately.' }
		],
		food: [
			{ name: 'Foresters’ Inn', note: 'Pub classics · afternoon tea' },
			{ name: 'Las Iguanas', note: 'Latin American · cocktails' },
			{ name: 'Huck’s American Bar & Grill', note: 'Burgers & grills · 3 courses from £25.95' },
			{ name: 'Rajinda Pradesh', note: 'Indian · 3 courses from £25.95' },
			{ name: 'Bella Italia', note: 'Italian · open from noon' },
			{ name: 'Café Rouge', note: 'French bistro · afternoon tea for two' },
			{ name: 'The Pancake House', note: 'Saturday-morning recovery' },
			{ name: 'Restaurant Runner', note: 'Restaurant food delivered to the lodge, 4:30–10pm' }
		],
		nearby: 'Longleat Safari Park is on the same estate. Bath, Stonehenge and Stourhead are all within about 40 minutes.',
		searchUrl: 'https://www.centerparcs.co.uk/breaks-we-offer/search.html/2/LF/19-03-2027/3/-/-/1/2/0/0/0/0/N'
	}
};

export const VILLAGE_IDS: VillageId[] = ['sherwood', 'longleat'];

// ---- lodges actually available for 19–22 March 2027 when checked ----
const L = (l: Lodge) => l;
export const LODGES: Lodge[] = [
	// Sherwood — own place for one couple
	L({ id: 'sf-studio', village: 'sherwood', name: 'Forest Studio Lodge', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'Bathroom', features: ['Hydrobath', 'Log burner', 'Studio layout'], price: 579, image: cp('Summer-Executive-Lodge-December-2015-01-3') }),
	L({ id: 'sf-forest-1', village: 'sherwood', name: 'Forest Lodge, two-storey (1 bed)', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'En-suite', features: ['Hydrobath', 'Two storey', 'Open-plan living'], price: 599, scarce: 'Only 7 left', image: cp('2-Bed-Executive-Lodge-Exterior-July-2017-EF-02-2') }),
	L({ id: 'sf-grand-studio', village: 'sherwood', name: 'Grand Forest Studio Lodge', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'En-suite', features: ['Updated style', 'Heated pergola seating', 'Hydrobath'], price: 629, scarce: 'Only 6 left', image: cp('double-bedroom-exec-plus-gallery') }),
	L({ id: 'sf-honeymoon', village: 'sherwood', name: 'Grand Forest Honeymoon Lodge', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'En-suite', features: ['Private sauna', 'Wine cooler', 'Log burner', 'Hydrobath'], price: 919, scarce: 'Only 1 left', image: cp('One-Bed-Penthouse-Sauna-SF-01-2'), note: 'Katie & Alex’s pick' }),
	// Sherwood — two couples sharing
	L({ id: 'sf-woodland-2', village: 'sherwood', name: 'Woodland Lodge (2 bed)', kind: 'pair', bedrooms: 2, doubles: 1, twins: 1, baths: 'Family bathroom + extra loo', features: ['Log burner', 'Open-plan living'], price: 699, image: cp('3-Bed-New-Woodland-Lodge-Exterior-July-2017-EF-04-2') }),
	L({ id: 'sf-woodland-3', village: 'sherwood', name: 'Woodland Lodge (3 bed)', kind: 'pair', bedrooms: 3, doubles: 1, twins: 2, baths: 'Family bathroom + extra loo', features: ['Log burner', 'Big open-plan living'], price: 799, image: cp('Summer-Woodland-Lodge-December-2015-02-4') }),
	L({ id: 'sf-forest-2', village: 'sherwood', name: 'Forest Lodge (2 bed)', kind: 'pair', bedrooms: 2, doubles: 1, twins: 1, baths: '2 en-suites', features: ['Hydrobath', 'En-suite each'], price: 759, image: cp('Summer-Executive-Lodge-December-2015-03-1') }),
	// Sherwood — the big house
	L({ id: 'sf-hottub-3', village: 'sherwood', name: 'Forest Lodge with hot tub (3 bed)', kind: 'hub', bedrooms: 3, doubles: 2, twins: 1, baths: '3 en-suites', features: ['Hot tub', 'Sauna', 'En-suite each'], price: 1559, scarce: 'Only 6 left', image: cp('3-bed-new-executive-hot-tub-sf-2') }),
	L({ id: 'sf-forest-4', village: 'sherwood', name: 'Forest Lodge (4 bed)', kind: 'hub', bedrooms: 4, doubles: 2, twins: 2, baths: '4 en-suites', features: ['Games room', 'Sauna', 'Two storey'], price: 1899, image: cp('4-Bed-Executive-Lodge-Games-Room-02') }),
	L({ id: 'sf-adapted-exclusive', village: 'sherwood', name: 'Adapted Exclusive Lodge (4 bed)', kind: 'hub', bedrooms: 4, doubles: 2, twins: 2, baths: '4 en-suites', features: ['Hot tub', 'Games room', 'Step-free', 'In from 2pm'], price: 2349, scarce: 'Only 1 left', image: cp('4-Bed-Exclusive-Hot-Tub-EF-01-2'), note: 'Step-free and wheelchair accessible, with the most room to spread out.' }),
	L({ id: 'sf-woodland-4', village: 'sherwood', name: 'Woodland Lodge (4 bed)', kind: 'hub', bedrooms: 4, doubles: 2, twins: 2, baths: 'Family bathroom + shower room + loo', features: ['Log burner', 'Big open-plan living'], price: 1449, image: cp('4-Bed-Woodland-Lodge-Exterior-July-2017-EF-03-2') }),

	// Longleat — own place
	L({ id: 'lf-studio-apt', village: 'longleat', name: 'Forest Studio Apartment', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'En-suite', features: ['Self-catering', 'Wine cooler', 'Double or twin beds'], price: 529, image: cp('Pinewood-Apartment-One-Bed-Living-Space-May-2016-LF-01-2') }),
	L({ id: 'lf-forest-1', village: 'longleat', name: 'Forest Lodge (1 bed)', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'Bathroom', features: ['Hydrobath', 'Log burner'], price: 619, image: cp('Summer-Executive-Lodge-December-2015-01-3') }),
	L({ id: 'lf-penthouse', village: 'longleat', name: 'Forest Studio Penthouse', kind: 'own', bedrooms: 1, doubles: 1, twins: 0, baths: 'En-suite + shower room', features: ['Infrared sauna', 'Hydrobath', 'Two storey', 'Balcony'], price: 749, scarce: 'Only 2 left', image: cp('Pinewood-Apartment-Penthouse-Balcony-May-2016-LF-01-1'), note: 'Katie & Alex’s pick' }),
	// Longleat — two couples sharing
	L({ id: 'lf-woodland-2', village: 'longleat', name: 'Woodland Lodge (2 bed)', kind: 'pair', bedrooms: 2, doubles: 1, twins: 1, baths: 'Family bathroom + extra loo', features: ['Log burner', 'Open-plan living'], price: 799, image: cp('3-Bed-New-Woodland-Lodge-Exterior-July-2017-EF-04-2') }),
	L({ id: 'lf-woodland-3', village: 'longleat', name: 'Woodland Lodge (3 bed)', kind: 'pair', bedrooms: 3, doubles: 1, twins: 2, baths: 'Family bathroom + extra loo', features: ['Log burner', 'Big open-plan living'], price: 929, image: cp('Summer-Woodland-Lodge-December-2015-02-4') }),
	L({ id: 'lf-forest-2', village: 'longleat', name: 'Forest Lodge (2 bed)', kind: 'pair', bedrooms: 2, doubles: 1, twins: 1, baths: '2 en-suites', features: ['Hydrobath', 'En-suite each'], price: 829, image: cp('Summer-Executive-Lodge-December-2015-03-1') }),
	// Longleat — the big house
	L({ id: 'lf-hottub-3', village: 'longleat', name: 'Forest Lodge with hot tub (3 bed)', kind: 'hub', bedrooms: 3, doubles: 2, twins: 1, baths: '3 en-suites', features: ['Hot tub', 'Infrared sauna', 'Log burner', 'Wine cooler'], price: 1829, scarce: 'Only 1 left', image: cp('3-bed-new-executive-hot-tub-sf-2') }),
	L({ id: 'lf-forest-4', village: 'longleat', name: 'Forest Lodge (4 bed)', kind: 'hub', bedrooms: 4, doubles: 2, twins: 2, baths: '4 en-suites', features: ['Games room', 'Sauna', 'Two storey'], price: 1899, scarce: 'Only 1 left', image: cp('4-Bed-Executive-Lodge-Games-Room-02') }),
	L({ id: 'lf-exclusive', village: 'longleat', name: 'Exclusive Lodge (4 bed)', kind: 'hub', bedrooms: 4, doubles: 2, twins: 2, baths: '4 en-suites + extra loo', features: ['Hot tub', 'Games room', 'Own parking', 'In from 2pm'], price: 2599, scarce: 'Only 5 left', image: cp('4-Bed-Exclusive-Hot-Tub-EF-01-2') }),
	L({ id: 'lf-grand-4', village: 'longleat', name: 'Grand Forest Lodge (4 bed)', kind: 'hub', bedrooms: 4, doubles: 2, twins: 2, baths: '4 en-suites', features: ['Hot tub', 'Games room', 'Updated style'], price: 2719, scarce: 'Only 5 left', image: cp('hot-tub-gallery-1') })
];

export const lodge = (id: string): Lodge => {
	const l = LODGES.find((x) => x.id === id);
	if (!l) throw new Error(`Unknown lodge ${id}`);
	return l;
};

// ---- curated combinations for six couples ----
export type Plan = {
	id: string;
	village: VillageId;
	name: string;
	tagline: string;
	hosts: string; // Katie & Alex's own lodge
	hostsAreHub?: boolean; // their lodge doubles as the hang-out
	hub?: { lodge: string; couples: number };
	others: { lodge: string; couples: number }[]; // own lodges, `couples` of them
	/** Pool every guest lodge and split the lot evenly between the five couples. */
	splitEvenly?: boolean;
	tier?: 'budget' | 'bougy';
};

export const GUEST_COUPLES = 5;

export const PLANS: Plan[] = [
	{ id: 'sf-budget', village: 'sherwood', tier: 'budget', name: 'The Budget Run', tagline: 'The cheapest way to sleep five couples: a 3-bed and a 2-bed Woodland Lodge, the total split evenly. Katie & Alex take the Honeymoon Lodge.',
		hosts: 'sf-honeymoon', splitEvenly: true, others: [{ lodge: 'sf-woodland-3', couples: 1 }, { lodge: 'sf-woodland-2', couples: 1 }] },
	{ id: 'lf-budget', village: 'longleat', tier: 'budget', name: 'The Budget Run', tagline: 'The cheapest way to sleep five couples: a 3-bed and a 2-bed Woodland Lodge, the total split evenly. Katie & Alex take the Penthouse.',
		hosts: 'lf-penthouse', splitEvenly: true, others: [{ lodge: 'lf-woodland-3', couples: 1 }, { lodge: 'lf-woodland-2', couples: 1 }] },
	{ id: 'sf-hot-tub-hub', village: 'sherwood', name: 'The Hot Tub Hub', tagline: 'Three couples share the hot-tub-and-sauna lodge. Two couples get their own front door.',
		hosts: 'sf-honeymoon', hub: { lodge: 'sf-hottub-3', couples: 3 }, others: [{ lodge: 'sf-studio', couples: 2 }] },
	{ id: 'sf-party-house', village: 'sherwood', tier: 'bougy', name: 'The Party House', tagline: 'Four couples in the step-free Exclusive Lodge: hot tub, games room, en-suite each.',
		hosts: 'sf-honeymoon', hub: { lodge: 'sf-adapted-exclusive', couples: 4 }, others: [{ lodge: 'sf-studio', couples: 1 }] },
	{ id: 'sf-games-room', village: 'sherwood', name: 'The Games Room', tagline: 'Cheapest hub with real amenities: games room, sauna, four en-suites.',
		hosts: 'sf-honeymoon', hub: { lodge: 'sf-forest-4', couples: 4 }, others: [{ lodge: 'sf-studio', couples: 1 }] },
	{ id: 'sf-own-doors', village: 'sherwood', name: 'Everyone Gets A Door', tagline: 'Katie & Alex take the hot-tub lodge and it becomes the clubhouse. Everyone else: own lodge, own double, own bathroom.',
		hosts: 'sf-hottub-3', hostsAreHub: true, others: [{ lodge: 'sf-studio', couples: 3 }, { lodge: 'sf-forest-1', couples: 2 }] },

	{ id: 'lf-hot-tub-hub', village: 'longleat', name: 'The Hot Tub Hub', tagline: 'Three couples share the hot-tub-and-sauna lodge. Two couples get their own apartment.',
		hosts: 'lf-penthouse', hub: { lodge: 'lf-hottub-3', couples: 3 }, others: [{ lodge: 'lf-studio-apt', couples: 2 }] },
	{ id: 'lf-party-house', village: 'longleat', tier: 'bougy', name: 'The Party House', tagline: 'Four couples in the Exclusive Lodge: hot tub, games room, own parking.',
		hosts: 'lf-penthouse', hub: { lodge: 'lf-exclusive', couples: 4 }, others: [{ lodge: 'lf-studio-apt', couples: 1 }] },
	{ id: 'lf-games-room', village: 'longleat', name: 'The Games Room', tagline: 'Cheapest hub with real amenities: games room, sauna, four en-suites. Only one left.',
		hosts: 'lf-penthouse', hub: { lodge: 'lf-forest-4', couples: 4 }, others: [{ lodge: 'lf-studio-apt', couples: 1 }] },
	{ id: 'lf-own-doors', village: 'longleat', name: 'Everyone Gets A Door', tagline: 'Katie & Alex take the hot-tub lodge and it becomes the clubhouse. Everyone else: own apartment, own bathroom.',
		hosts: 'lf-hottub-3', hostsAreHub: true, others: [{ lodge: 'lf-studio-apt', couples: 5 }] }
];

export type PlanSummary = {
	plan: Plan;
	hubShare: number | null; // per couple
	guestLow: number; // cheapest per-couple price for a guest couple
	guestHigh: number;
	total: number; // whole booking incl. Katie & Alex
	twinCouples: number; // couples who'd sleep in a twin room
	hasHotTub: boolean;
	hasSauna: boolean;
	hasGames: boolean;
};

export function summarisePlan(plan: Plan): PlanSummary {
	const host = lodge(plan.hosts);
	const hub = plan.hub ? lodge(plan.hub.lodge) : null;
	const hubShare = hub && plan.hub ? hub.price / plan.hub.couples : null;
	const othersTotal = plan.others.reduce((s, o) => s + lodge(o.lodge).price * o.couples, 0);
	const prices = plan.splitEvenly
		? [(othersTotal + (hub?.price ?? 0)) / GUEST_COUPLES]
		: plan.others.map((o) => lodge(o.lodge).price);
	if (hubShare !== null && !plan.splitEvenly) prices.push(hubShare);
	const total = host.price + (hub?.price ?? 0) + othersTotal;
	const shared = [...(hub && plan.hub ? [{ l: hub, n: plan.hub.couples }] : []), ...(plan.splitEvenly ? plan.others.map((o) => ({ l: lodge(o.lodge), n: lodge(o.lodge).bedrooms * o.couples })) : [])];
	const twinCouples = shared.reduce((s, x) => s + Math.max(0, x.n - x.l.doubles), 0);
	const all = [host, ...(hub ? [hub] : [])].flatMap((l) => l.features.join(' ').toLowerCase());
	const f = all.join(' ');
	return {
		plan, hubShare, total, twinCouples,
		guestLow: Math.min(...prices), guestHigh: Math.max(...prices),
		hasHotTub: f.includes('hot tub'), hasSauna: f.includes('sauna'), hasGames: f.includes('games room')
	};
}

/** Cheapest set of up to three lodges with a bedroom for every guest couple. */
export function cheapestLodges(village: VillageId, couples = GUEST_COUPLES, exclude: string[] = []) {
	const pool = LODGES.filter((l) => l.village === village && !exclude.includes(l.id));
	let best: { ids: string[]; total: number } | null = null;
	const walk = (start: number, picked: Lodge[]) => {
		const beds = picked.reduce((s, l) => s + l.bedrooms, 0);
		if (beds >= couples) {
			const total = picked.reduce((s, l) => s + l.price, 0);
			if (!best || total < best.total) best = { ids: picked.map((l) => l.id), total };
			return;
		}
		if (picked.length === 3) return;
		for (let i = start; i < pool.length; i++) walk(i, [...picked, pool[i]]);
	};
	walk(0, []);
	return best as { ids: string[]; total: number } | null;
}

export const planFor = (village: VillageId, tier: 'budget' | 'bougy') =>
	summarisePlan(PLANS.find((p) => p.village === village && p.tier === tier)!);

// ---- what each person tells us ----
export const ACCOM_CHOICES = [
	{ id: 'cheapest', label: 'Cheapest possible', blurb: 'Five couples split the cheapest lodges evenly. Probably a twin room and a shared bathroom.' },
	{ id: 'hub', label: 'Share the big house', blurb: 'Hot tub / games room on tap. You might draw a twin room.' },
	{ id: 'pair', label: 'Share a 2-bed with one couple', blurb: 'Half the price of a lodge. One couple gets the twin room.' },
	{ id: 'own-budget', label: 'Our own place — cheapest', blurb: 'Own front door, own double, own bathroom.' },
	{ id: 'own-nicer', label: 'Our own place — a bit nicer', blurb: 'Own lodge with an upgrade: newer finish, sauna or hydrobath.' },
	{ id: 'either', label: 'Honestly, either', blurb: 'Put us wherever makes the maths work.' }
] as const;
export type AccomChoice = (typeof ACCOM_CHOICES)[number]['id'];
export const ACCOM_IDS = new Set<string>(ACCOM_CHOICES.map((a) => a.id));

export const BUDGETS = [
	{ id: '400', label: 'Up to £400' },
	{ id: '500', label: '£400–£500' },
	{ id: '600', label: '£500–£600' },
	{ id: '700', label: '£600+' }
] as const;
export const BUDGET_IDS = new Set<string>(BUDGETS.map((b) => b.id));

/** Per-couple accommodation range (3 nights) for each choice in each village. */
const ROLE_LODGES: Record<VillageId, Record<Exclude<AccomChoice, 'either' | 'cheapest'>, [string, number][]>> = {
	sherwood: {
		hub: [['sf-hottub-3', 3], ['sf-forest-4', 4], ['sf-adapted-exclusive', 4]],
		pair: [['sf-woodland-2', 2], ['sf-forest-2', 2]],
		'own-budget': [['sf-studio', 1], ['sf-forest-1', 1]],
		'own-nicer': [['sf-grand-studio', 1]]
	},
	longleat: {
		hub: [['lf-forest-4', 4], ['lf-hottub-3', 3], ['lf-exclusive', 4]],
		pair: [['lf-woodland-2', 2], ['lf-forest-2', 2]],
		'own-budget': [['lf-studio-apt', 1]],
		'own-nicer': [['lf-forest-1', 1], ['lf-penthouse', 1]]
	}
};

export type Range = [number, number];

export function accomRange(village: VillageId, choice: AccomChoice): Range {
	if (choice === 'cheapest') {
		const share = planFor(village, 'budget').guestLow;
		return [share, share];
	}
	const roles = choice === 'either' ? Object.values(ROLE_LODGES[village]).flat() : ROLE_LODGES[village][choice];
	const each = roles.map(([id, split]) => lodge(id).price / split);
	if (choice === 'either') each.push(planFor(village, 'budget').guestLow);
	return [Math.min(...each), Math.max(...each)];
}

// Spending allowances per couple for Fri–Mon. Estimates, not bills.
export const FOOD_ROWS = [
	{ label: 'Big shop for the lodge', detail: 'Breakfasts, lunches, snacks, drinks — split with your lodge', low: 60, high: 90 },
	{ label: 'Friday night in', detail: 'Restaurant Runner or a group cook-up at the big house', low: 25, high: 40 },
	{ label: 'Saturday night out', detail: 'Three courses from £25.95pp, plus drinks', low: 70, high: 100 },
	{ label: 'Sunday', detail: 'Pancake House brunch and a cheap tea in', low: 30, high: 50 }
];
export const FOOD: Range = [FOOD_ROWS.reduce((s, r) => s + r.low, 0), FOOD_ROWS.reduce((s, r) => s + r.high, 0)];
export const ACTIVITIES: Range = [0, 120]; // pool & walks free; two paid activities each at the top end
export const FUEL_PER_MILE = 0.16; // ~£1.40/litre at ~40mpg, per car (so per couple)

export type Estimate = {
	accom: Range;
	offer: number;
	food: Range;
	activities: Range;
	fuel: number | null;
	total: Range;
};

export function estimate(village: VillageId, choice: AccomChoice, takeOffer: boolean, roadMiles: number | null): Estimate {
	const accom = accomRange(village, choice);
	const offer = takeOffer ? OFFER : 0;
	const fuel = roadMiles === null ? null : Math.round(roadMiles * 2 * FUEL_PER_MILE);
	const total: Range = [0, 1].map((i) =>
		Math.max(0, accom[i] - offer) + FOOD[i] + ACTIVITIES[i] + (fuel ?? 0)
	) as Range;
	return { accom, offer, food: FOOD, activities: ACTIVITIES, fuel, total };
}

// ---- distance ----
export const HOME = { label: 'Cullingworth', lat: 53.8261, lng: -1.8985 };

/** Straight-line miles between two points. */
export function crowMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
	const R = 3958.8;
	const rad = (d: number) => (d * Math.PI) / 180;
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough driving estimate: roads are ~1.25× the crow-fly, ~50mph door to door. */
export function drive(from: { lat: number; lng: number }, village: VillageId) {
	const miles = Math.round(crowMiles(from, VILLAGES[village]) * 1.25);
	const minutes = Math.round((miles / 50) * 60 / 5) * 5;
	return { miles, minutes };
}

export const fmtDrive = (minutes: number) => {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return h ? `${h}h${m ? ` ${String(m).padStart(2, '0')}m` : ''}` : `${m}m`;
};

export const money = (n: number) =>
	new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Math.round(n));
export const range = (r: Range) => (Math.round(r[0]) === Math.round(r[1]) ? money(r[0]) : `${money(r[0])}–${money(r[1])}`);

// ---- names ----
export function cleanName(raw: unknown): string {
	return (typeof raw === 'string' ? raw : '').trim().replace(/\s+/g, ' ').slice(0, 24);
}
export function nameKey(name: string | null | undefined): string {
	return cleanName(name ?? '').toLowerCase();
}

// ---- a person's answers ----
export type Response = {
	name: string;
	village: VillageId | null;
	accom: AccomChoice | null;
	twinOk: boolean;
	budget: string | null;
	offer: boolean;
	notes: string;
};

export function sanitizeResponse(raw: unknown): Omit<Response, 'name'> {
	const r = (raw ?? {}) as Record<string, unknown>;
	const village = r.village === 'sherwood' || r.village === 'longleat' ? r.village : null;
	const accom = typeof r.accom === 'string' && ACCOM_IDS.has(r.accom) ? (r.accom as AccomChoice) : null;
	const budget = typeof r.budget === 'string' && BUDGET_IDS.has(r.budget) ? r.budget : null;
	const notes = typeof r.notes === 'string' ? r.notes.trim().slice(0, 500) : '';
	return { village, accom, twinOk: r.twinOk === true, budget, offer: r.offer === true, notes };
}

export type Tally = {
	people: number;
	village: Record<VillageId, number>;
	accom: Record<AccomChoice, number>;
	offer: number;
	twinOk: number;
};

export function tally(rows: Omit<Response, 'notes'>[]): Tally {
	const t: Tally = {
		people: 0,
		village: { sherwood: 0, longleat: 0 },
		accom: { cheapest: 0, hub: 0, pair: 0, 'own-budget': 0, 'own-nicer': 0, either: 0 },
		offer: 0,
		twinOk: 0
	};
	for (const r of rows) {
		if (!r.village && !r.accom) continue;
		t.people++;
		if (r.village) t.village[r.village]++;
		if (r.accom) t.accom[r.accom]++;
		if (r.offer) t.offer++;
		if (r.twinOk) t.twinOk++;
	}
	return t;
}
