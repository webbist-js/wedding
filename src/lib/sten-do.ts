// The Sten Is Right — shared data for the /the-sten-is-right voting page.
// Content only: safe to import on both server and client. The voting
// persistence/aggregation lives in $lib/server/sten-do.ts.
//
// Dates assumed 19–21 March 2027 (Fri–Sun). Prices indicative; data pulled
// 5 Nov 2026 from each listing. `nearby` / `cost` may contain inline markup
// (<b>, <i>, <small>) rendered with {@html} on a trusted, static source.

export type Amenity = [label: string, highlight: 0 | 1];

export type House = {
	id: string;
	n: number;
	name: string;
	loc: string;
	sleeps: number;
	beds: number | null;
	baths: number | null;
	wish: boolean;
	rate: string | null;
	rateNote: string;
	amen: Amenity[];
	nearby: string;
	src: string;
	url: string;
};

export type Lead = { h: string; p: string; mini: string };

export type Extra = {
	t: string;
	what: string;
	cost: string;
	links: [label: string, url: string][];
};

export const VOTES_TOTAL = 3;

export const HOUSES: House[] = [
	{ id: 'richmond', n: 1, name: 'Richmond Spa Cottage', loc: 'Richmond, North Yorkshire', sleeps: 12, beds: 6, baths: 4,
		wish: true, rate: null, rateNote: 'Quote for your dates',
		amen: [['Hot tub (8-person)', 1], ['Sauna', 1], ['Cold plunge', 0], ['Salt wall', 0], ['Pool table', 1]],
		nearby: 'Yorkshire Dales on the doorstep · <b>clay pigeon</b> at Coniston · shops & pubs 200m',
		src: 'Airbnb', url: 'https://www.airbnb.co.uk/rooms/1613644919597182615' },
	{ id: 'throwley', n: 2, name: 'Throwley Lodge', loc: 'Oakamoor, Staffs Moorlands', sleeps: 14, beds: 7, baths: 7,
		wish: true, rate: null, rateNote: 'Quote · rated 4.79', amen: [['Two hot tubs', 1], ['All en-suite', 1], ['Log burner', 0], ['BBQ', 0]],
		nearby: '<b>Alton Towers</b> 5 min · Peak District · Chester Zoo ~1 hr',
		src: 'Airbnb', url: 'https://www.airbnb.co.uk/rooms/1034630519943838569' },
	{ id: 'eastrington', n: 3, name: 'Woodland Lodge', loc: 'Eastrington, East Yorkshire', sleeps: 14, beds: 7, baths: 7,
		wish: true, rate: null, rateNote: 'Quote for your dates', amen: [['Hot tub (for 10)', 1], ['All en-suite', 1], ['1.3-acre grounds', 0], ['Fire pit & BBQ', 0]],
		nearby: 'North York Moors ~1 hr · <b>Yorkshire Wildlife Park</b> (zoo) ~40 min',
		src: 'Airbnb', url: 'https://www.airbnb.co.uk/rooms/1634562876118468091' },
	{ id: 'granary-york', n: 4, name: 'The Granary', loc: 'Nr York, North Yorkshire', sleeps: 12, beds: 5, baths: 5.5,
		wish: false, rate: null, rateNote: 'Quote · Superhost', amen: [['Hot tub', 1], ['All en-suite', 1], ['7 mi to York', 0]],
		nearby: 'York 7 mi · Yorkshire Wildlife Park ~50 min · <b>clay pigeon</b> near York',
		src: 'Airbnb', url: 'https://www.airbnb.co.uk/rooms/36993336' },
	{ id: 'waterloo', n: 5, name: 'Waterloo Lodge', loc: 'Melsonby, North Yorkshire', sleeps: 12, beds: 6, baths: 5,
		wish: false, rate: 'from £499', rateNote: 'per night (indicative)', amen: [['Hot tub', 1], ['Games room', 1], ['Two lounges', 0], ['Annex en-suites', 0]],
		nearby: 'Scotch Corner & the Dales · Richmond · <b>clay pigeon</b> at Coniston',
		src: 'CoolStays', url: 'https://www.coolstays.com/property/waterloo-lodge/25539' },
	{ id: 'westfield', n: 6, name: 'Westfield Granary', loc: 'Nr Malton, North Yorkshire', sleeps: 14, beds: 6, baths: 3,
		wish: false, rate: 'from £2,600', rateNote: 'per week (indicative)', amen: [['Two hot tubs', 1], ['Games room', 1], ['Two log-burners', 0], ['BBQ', 0]],
		nearby: '<b>Flamingo Land</b> (theme park + zoo) ~35 min · Scarborough coast',
		src: 'CoolStays', url: 'https://www.coolstays.com/property/westfield-granary/22669' },
	{ id: 'aquarius', n: 7, name: 'Aquarius Rising', loc: 'Richmond, North Yorkshire', sleeps: 12, beds: 6, baths: 4,
		wish: false, rate: null, rateNote: 'Quote · rated 10/10', amen: [['Hot tub', 1], ['Sauna', 1], ['Pool table', 1], ['270-acre estate', 0]],
		nearby: 'Yorkshire Dales · private estate grounds · <b>clay pigeon</b> at Coniston',
		src: 'CoolStays / Expedia', url: 'https://www.expedia.com/Richmond-Hotels-Aquarius-Rising-A-House-That-Sleeps-12-Guests-In-6-Bedrooms.h103970941.Hotel-Information' },
	{ id: 'agricola', n: 8, name: 'Agricola House', loc: 'Wirksworth, Peak District', sleeps: 14, beds: 7, baths: 5,
		wish: false, rate: null, rateNote: 'Quote for your dates', amen: [['Sauna', 1], ['Cinema room', 1], ['Accessible', 0], ['Adaptable rooms', 0]],
		nearby: 'Peak District · <b>Alton Towers</b> ~40 min · Heights of Abraham',
		src: 'Group Accommodation', url: 'https://www.groupaccommodation.com/properties/agricola-house-matlock-derbyshire' },
	{ id: 'fellside', n: 9, name: 'Fellside House', loc: 'Howgills (Dales / Lakes edge)', sleeps: 24, beds: 12, baths: 12,
		wish: false, rate: null, rateNote: 'Quote · big house', amen: [['Hot tub', 1], ['12 en-suites', 1], ['Gardens & grounds', 0]],
		nearby: 'Yorkshire Dales & Lakes · Sedbergh · <i>bigger than you need — but a bathroom each, twice over</i>',
		src: "Kate & Tom's", url: 'https://events.kateandtoms.com/houses/fellside-house' },
	{ id: 'westend', n: 10, name: 'West End Farm', loc: 'Nr Driffield, East Yorkshire', sleeps: 14, beds: null, baths: null,
		wish: false, rate: null, rateNote: 'Quote · beds on enquiry', amen: [['Hot tub (for 12)', 1], ['Gym equipment', 1], ['Outdoor games', 1], ['26 acres', 0]],
		nearby: '<b>Go Ape</b> Dalby Forest · Yorkshire Wildlife Park · E Yorks coast',
		src: "Kate & Tom's", url: 'https://events.kateandtoms.com/houses/west-end-farm' }
];

export const LEADS: Lead[] = [
	{ h: 'Sowerby Bridge house', p: 'West Yorkshire · sleeps 12 · 6 bed · 6 bath · hot tub. A bathroom per couple, closest to home.', mini: 'Search: Country Cottages Online — Sowerby Bridge sleeps 12' },
	{ h: 'Hebden Bridge retreat', p: 'West Yorkshire · sleeps 16 · 6 bed · 4 bath · hot tub, sauna & cold plunge, games room — owner lists chef, caterer & cocktail contacts.', mini: 'Search: Simply Owners — Hebden Bridge celebration retreat' },
	{ h: 'Hamps Hall & Barn', p: 'Staffordshire Moorlands · two linked houses, up to 40 · two hot tubs, games room. The ‘if the numbers grow’ option.', mini: 'Search: Party Houses — Hamps Hall & Barn' }
];

export const EXTRAS: Extra[] = [
	{ t: 'Private chef', what: 'Cook comes to the house for a 3-course feast — washing-up included. Hen/stag menus are their bread and butter.',
		cost: '~£55–£75pp <small>(≈£700–£1,000 for the group)</small>',
		links: [['Yhangry', 'https://yhangry.com/f/private-chefs/hen-stag-do'], ['Take a Chef', 'https://www.takeachef.com/en-gb/private-chef/yorkshire']] },
	{ t: 'Murder mystery night', what: "Pro actors host an interactive whodunnit in the house — everyone's a suspect. Red Herring Games are Yorkshire-based.",
		cost: 'from ~£325–£770 <small>per event (actor-led)</small>',
		links: [['Poptop — Leeds', 'https://www.poptop.uk.com/leeds-city/suppliers/murder-mystery/'], ['AddToEvent', 'https://www.addtoevent.co.uk/listings/murder-mysteries/north-yorkshire']] },
	{ t: 'Clay pigeon shooting', what: 'Coniston Shooting Ground in the Dales (near Skipton) — CPSA ‘Premier’ ground, stag/corporate friendly, up to ~40.',
		cost: '~£70 <small>for 30 clays, per person</small>',
		links: [['Experiences.co.uk', 'https://www.experiences.co.uk/experience/clay-pigeon-shooting-in-the-yorkshire-dales/12050/'], ['Yorkshire Activity Centre', 'https://bookaparty.com/products/9502-clay-pigeon-shooting']] },
	{ t: 'Mobile spa / masseuse', what: 'Therapists come to you — 20-min massages & facials around the hot tub. The recovery session for Sunday morning.',
		cost: '~£32.50pp <small>/ packages from ~£180–£249</small>',
		links: [['AddToEvent — N Yorks', 'https://www.addtoevent.co.uk/listings/pamper-and-spa-parties/north-yorkshire'], ['Funktion Events', 'https://www.funktionevents.co.uk/home-and-mobile-pamper-hen-party']] },
	{ t: 'Theme park & zoo day', what: "The region's trump card: Alton Towers (next to Oakamoor), plus Flamingo Land which is a theme park AND a zoo in one.",
		cost: 'gate prices vary <small>· pre-book for best rates</small>',
		links: [['Alton Towers', 'https://www.altontowers.com'], ['Flamingo Land', 'https://www.flamingoland.co.uk'], ['Yorkshire Wildlife Park', 'https://www.yorkshirewildlifepark.com']] },
	{ t: 'Magician, comedy & drag', what: 'Close-up magicians, comedy hosts and drag / cabaret acts all bookable to the venue through the big entertainer marketplaces.',
		cost: 'varies by act <small>· browse & quote</small>',
		links: [['Poptop entertainers', 'https://www.poptop.uk.com'], ['AddToEvent', 'https://www.addtoevent.co.uk']] }
];

export const HOUSE_IDS: Set<string> = new Set(HOUSES.map((h) => h.id));
