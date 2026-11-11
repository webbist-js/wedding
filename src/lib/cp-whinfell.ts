// Content for the booked trip page (/stendo): Whinfell Forest facts, things
// to do, the packing list and the shopping list. Facts checked on
// centerparcs.co.uk on 10 November 2026; see docs/whinfell-research.md.

import { cp } from './stendo';
import type { IconName } from './components/cp-trip/TripIcon.svelte';

export type Activity = {
	id: string;
	name: string;
	blurb: string;
	price?: string;
	minAge?: string;
	image?: string;
	/** A sensible pick for the one activity the group budget pays for. */
	group?: string;
	/** Not a real plan. Probably. */
	joke?: boolean;
	/** A name from TripIcon's ICONS. */
	icon?: IconName;
};

// Adult and group activities offered at Whinfell. Center Parcs only shows
// price bands until you're signed in to a booking, so that's what we show.
export const ACTIVITIES: Activity[] = [
	{ id: 'bowling', name: 'Ten-pin bowling', blurb: 'The Leisure Bowl. Up to 8 a lane, so we’d need two.', minAge: '8+', image: cp('LF%20LEISURE%20BOWL%208'), group: 'Two lanes take all 13 of us. Cheap, daft and properly competitive.' },
	{ id: 'late-lanes', name: 'Late Night Lanes', blurb: 'DJ-hosted late-night bowling with games. Saturday night energy.', price: '£16–£25 band', image: cp('Leisure%20Bowl%20LF%2002%20RT'), group: 'Bowling with a DJ after dark. A Saturday night out sorted.' },
	{ id: 'escape-plant', name: 'Escape room: The Plant Room', blurb: 'Only at Whinfell. Fix the Plant Room before the village powers down. Max 6.', price: '£36+ band', image: cp('Leisure.Escape%20the%20Forest.Forest%20Laboratory.WO.20.03.24.NNewbold.Perpetuity.62-1') },
	{ id: 'escape-lab', name: 'Escape room: Forest Laboratory', blurb: 'Woodland-themed puzzles. Max 6 a room.', price: '£36+ band', image: cp('Leisure.Escape%20the%20Forest.Forest%20Laboratory.WO.20.03.24.NNewbold.Perpetuity.30-1'), group: 'Teams of up to six racing the same room against the clock. Slowest team buys a round.' },
	{ id: 'singpods', name: 'SingPods', blurb: 'Private soundproof karaoke pods, 30 or 60 minutes. Nobody outside hears.', price: '£36+ band', image: cp('SINGPODS%202') },
	{ id: 'arena', name: 'The ARENA', blurb: 'A glass arena of agility, reaction and puzzle games in the Entertainment Hive. Whinfell only.', price: '£16–£35 band', image: cp('ENTERTAINMENT%20HIVE%20-%20THE%20ARENA%20-%20WF%203') },
	{ id: 'darts', name: 'Interactive darts', blurb: 'Augmented-reality darts with live scoring. Groups up to 8.', minAge: '12+', image: cp('1I9A3077-1') },
	{ id: 'puttify', name: 'Puttify', blurb: 'Neon, tech-scored mini golf in the Entertainment Hive. About 45 minutes.', price: '£0–£15 band', image: cp('puttify_entertainment_hive') },
	{ id: 'quads', name: 'Quad bike safari', blurb: '40 minutes off-road on an all-terrain track.', price: '£36+ band', minAge: '16+', image: cp('Summer%20brand%20shoot.%20SF.%20Junior%20Quads.%20CCornwell.015%2010%2008%2023-3') },
	{ id: 'segway', name: 'Segway experience', blurb: 'Training track, a ride round the village, then off-road obstacles.', price: '£36+ band', image: cp('Segways%20in%20Forest%20Woburn%20Forest%20Brand%20August%202016%2004-1') },
	{ id: 'paintball', name: 'Paintball', blurb: 'Classic woodland paintball. Settle some scores.', price: '£36+ band', image: cp('Paintball%20WF%2035-1') },
	{ id: 'laser-clays', name: 'Laser clay shoot-out', blurb: 'Laser rifles against flying clays.', price: '£26–£35 band', image: cp('LASER%20CLAYS09-1'), group: 'Clay shooting without the noise or the licence. Very leaderboard-friendly.' },
	{ id: 'archery', name: 'Archery', blurb: 'Target, a woodland field course, or crossbows.', price: '£26–£35+ band', image: cp('Summer%20brand%20shoot.%20SF.%20Target%20archery.%20School-age.%20CCornwell.002%2010%2008%2023-4'), group: 'Easy to learn, everyone gets a go, and somebody will turn out to be scarily good.' },
	{ id: 'aerial', name: 'Aerial Adventure', blurb: 'Treetop ropes up to 12 m, finishing on the zip wire across the lake.', price: '£36+ band', image: cp('Summer%20brand%20shoot.%20SF.%20Aerial%20Adventure.%20School-age.%20CCornwell.002%2010%2008%2023-4') },
	{ id: 'falconry', name: 'Falconry', blurb: 'Fly owls, hawks and falcons. Runs undercover October to March.', price: '£16–£25 band', image: cp('Junior%20Falconers%20Club%20SF%20116-1'), group: 'Something none of us has done. Undercover in March, so the weather can’t ruin it.' },
	{ id: 'bat-cage', name: 'The Bat Cage', blurb: 'Cricket, baseball and tennis simulators in the Entertainment Hive. Whinfell only.', price: '£26–£35+ band', image: cp('ENTERTAINMENT%20HIVE%20-%20THE%20BAT%20CAGE%20-%20WF%205') },
	{ id: 'driving-range', name: 'Golf driving range', blurb: 'Only at Whinfell. Two clubs, 80 balls, no skill required.', price: '£0–£15 band', image: cp('Golf%20Driving%20Range%20SF%2017-1') },
	{ id: 'aqua-sana', name: 'Aqua Sana spa', blurb: 'Saunas, steam rooms, outdoor hot tubs and an outdoor pool. Booked separately.', price: 'Day packages from £69', minAge: '14+', image: cp('Aqua%20Sana%20Outdoor%20Pool%20November%202018%20WF%2002') }
];

// Extra poll options that aren't Center Parcs bookings.
// Twelve, so the grid never leaves a card on its own.
export const GROUP_PLANS: Activity[] = [
	{ id: 'gym', icon: 'dumbbell', name: 'Early gym crew', blurb: 'Start the day with a workout with Alex. Gym passes are £15 each.' },
	{ id: 'bikes', icon: 'bike', name: 'Bike hire', blurb: 'Get around the village on two wheels.' },
	{ id: 'pool', icon: 'pool', name: 'Pool session', blurb: 'The Subtropical Swimming Paradise. Included in the stay.' },
	{ id: 'dinner-out', icon: 'utensils', name: 'Group meal out', blurb: 'One night at a village restaurant, booked ahead for all of us.' },
	{ id: 'cook-in', icon: 'cooking-pot', name: 'Big cook-in at House 1', blurb: 'One night where we all cook and eat together at base camp.' },
	{ id: 'fry-up', icon: 'egg', name: 'Saturday fry-up', blurb: 'Everyone at House 1 for a big breakfast before anyone’s allowed to do anything.' },
	{ id: 'hot-tub', icon: 'bath', name: 'Hot tub till late', blurb: 'Drinks on the side, jets on, no agenda. Bring your swimmers to House 1.' },
	{ id: 'olympics', icon: 'medal', name: 'The Stendo Olympics', blurb: 'Pool table, darts, beer pong and Mario Kart. Medals, a podium and lifelong grudges.' },
	{ id: 'quiz', icon: 'brain', name: 'Pub quiz at base camp', blurb: 'Teams by lodge. House 3 gets Theo as a lifeline.' },
	{ id: 'squirrels', icon: 'squirrel', name: 'Red squirrel census', blurb: 'Whinfell is a red squirrel sanctuary. Count them, name them, rank them.', joke: true },
	{ id: 'tree-hug', icon: 'tree', name: 'Dawn tree-hugging circle', blurb: '6am. In silence. Sustained eye contact with an oak.', joke: true },
	{ id: 'sacrifice', icon: 'knife', name: 'Forest sacrifice', blurb: 'A solemn ceremony at dusk to keep the forest spirits happy. Offering chosen by group vote.', joke: true }
];

// A handful for Theo. Ages as Center Parcs lists them.
export const KIDS: Activity[] = [
	{ id: 'sensory-babies', name: 'Sensory Play Babies', blurb: 'Gentle textures, sounds and nursery rhymes.', price: '2–12 months', image: cp('Sensory%20Play%20Babies%20Oct%202014%20WF%2010-2') },
	{ id: 'sensory-toddlers', name: 'Sensory Play Toddlers', blurb: 'Multi-sensory session with songs.', price: '13–36 months', image: cp('SENSORY%20PLAY%20TODDLERS%20002-1') },
	{ id: 'balance-bikes', name: 'Baby Balance Bike Buddy', blurb: 'Baby balance trikes on a mini course. Must stand unaided.', price: '10 months–2 years', image: cp('Baby%20Balance%20Bikes%20October%202019%20WO%2026-2') },
	{ id: 'imprints', name: 'Baby Imprints', blurb: 'A 3D cast of Theo’s hand or foot. Book on day one or two, collect when you leave.', image: cp('Memorable%20Imprints%20-%20Baby%20Imprints%20%20003%2029%2003%2023-1') },
	{ id: 'music-movers', name: 'Mini Musical Movers', blurb: 'Singing, instruments and dancing in The Studio.', price: '18 months–5 years', image: cp('Mini%20Music%20Lovers%20October%202014%20WF%2015-1') },
	{ id: 'pool-theo', name: 'The pool', blurb: 'Free buoyancy aids. Bring swim nappies. One adult per under-5.', image: cp('wf-overview-gallery-stsp') }
];

export const ACTIVITY_IDS = [...GROUP_PLANS, ...ACTIVITIES].map((a) => a.id);

export const RESTAURANTS: { name: string; blurb: string }[] = [
	{ name: 'Huck’s American Bar & Grill', blurb: 'Burgers, grills and cocktails. 3 courses from £25.95.' },
	{ name: 'Rajinda Pradesh', blurb: 'Indian. Closed Mondays. 3 courses from £25.95.' },
	{ name: 'Bella Italia', blurb: 'Classic Italian, open all day.' },
	{ name: 'Café Rouge', blurb: 'French bistro. Breakfast through dinner, Sunday roast.' },
	{ name: 'The Lakeside Inn', blurb: 'Whinfell-only lakeside pub. Sunday roast.' },
	{ name: 'The Pancake House', blurb: 'Sweet and savoury pancakes and waffles from 8:30am.' },
	{ name: 'Sports Café', blurb: 'Live sport, food and beer. Walk in.' },
	{ name: 'Entertainment Hive', blurb: 'Whinfell-only. Detroit-style pizza and drinks beside the games. No booking.' },
	{ name: 'Restaurant Runner', blurb: 'Lodge delivery from several restaurants, 4:30–10pm. Order on the day.' }
];

export const GALLERY: { src: string; alt: string }[] = [
	{ src: cp('WF-updated-thumbnail-1', 1800), alt: 'Whinfell’s lake and Boathouse at dusk, surrounded by pine forest' },
	{ src: cp('Lake%20STSP%20Drone%20WF%20July%202021%201-1'), alt: 'The glass pool dome beside the lake, ringed by pine forest' },
	{ src: cp('wf-overview-gallery-boathouse'), alt: 'Misty morning by the lake, canoes in front of the pool dome' },
	{ src: cp('wf-overview-gallery-stsp'), alt: 'Inside the Subtropical Swimming Paradise: palms and turquoise water' },
	{ src: cp('Red%20Squirrel%20Walk%20WF%2004'), alt: 'A red squirrel in the Whinfell woods' }
];

// Example photos of each lodge type, not our exact lodges.
export const LODGE_IMAGES: Record<'h1' | 'h2' | 'h3', { src: string; alt: string } | null> = {
	h1: { src: cp('luxury-exclusive-patio-gallery'), alt: 'An Exclusive Lodge patio with its hot tub (example photo)' },
	h2: { src: cp('2%20Bed%20Woodland%20Lodge%20Detached%20WL2D%20Exterior%20WF%20September%202017%2001-1'), alt: 'A Woodland Lodge at Whinfell among the trees (example photo)' },
	h3: { src: cp('3%20Bed%20Woodland%20Lodge%20Two%20Storey%20WL32%20Exterior%20WF%20September%202017%2003-1'), alt: 'A Woodland Lodge at Whinfell (example photo)' }
};

/** The trip page banner: Whinfell's Forest Lodges on a pine path in low evening sun. */
export const BANNER = { src: cp('3%20Bed%20Executive%20Lodge%20Two%20Storey%20XL3D%20Exterior%20WF%20September%202017%2004-1', 2000), alt: 'Timber lodges among tall Scots pines at Whinfell, lit by low evening sun' };

export const HERO = { src: cp('WF-updated-thumbnail-1', 1800), alt: 'Whinfell’s lake and Boathouse at dusk, surrounded by pine forest' };

export const ITINERARY = [
	{ day: 'Friday', date: '19 March', title: 'Arrival', text: 'Arrive, settle in, get everyone together.' },
	{ day: 'Saturday', date: '20 March', title: 'Full day', text: 'A full day at Center Parcs.' },
	{ day: 'Sunday', date: '21 March', title: 'Full day', text: 'Another full day together.' },
	{ day: 'Monday', date: '22 March', title: 'Home', text: 'Departure.' }
];

// ------------------------------------------------------------- packing ---

export type PackSection = { id: string; title: string; note?: string; items: string[] };

export const PACK: PackSection[] = [
	{
		id: 'bedding',
		title: 'Bedding from home',
		note: 'Center Parcs makes up every bed with their own linen and duvets. Double rooms: just bring your pillows. Twin rooms: bring a double fitted sheet too, to turn the two singles into one double.',
		items: ['Pillows', 'Double fitted sheet (twin rooms only)', 'Throw or blanket for the sofa']
	},
	{
		id: 'drinks',
		title: 'Drinks',
		note: 'Bring your alcohol of choice, enough for the weekend.',
		items: ['Your drink of choice', 'Mixers', 'Soft drinks', 'Something to share in the hot tub']
	},
	{
		id: 'food',
		title: 'Food',
		note: 'Every lodge has a kitchen. Bring whatever you like to eat.',
		items: ['Snacks', 'Things to cook', 'Sandwich stuff', 'Breakfast bits', 'Tea, coffee and milk']
	},
	{
		id: 'fun',
		title: 'Fun',
		items: ['Game consoles (and controllers, HDMI cables)', 'Board games', 'Cards', 'A speaker']
	},
	{
		id: 'swim',
		title: 'Pool, hot tub and sauna',
		note: 'Lodge towels are provided; pool towels aren’t (or hire one for £3).',
		items: ['Swimwear', 'Pool towel', 'Flip-flops or sliders', 'Goggles', 'A dressing gown']
	},
	{
		id: 'out',
		title: 'Outdoors and active',
		note: 'It’s Cumbria in March.',
		items: ['Waterproof coat', 'Warm layers', 'Comfy shoes or walking boots', 'Gym kit and trainers', 'A torch for walking back at night']
	},
	{
		id: 'theo',
		title: 'For Theo',
		note: 'A cot and highchair are already in the lodge.',
		items: ['Cot linen', 'Swim nappies', 'Travel cot (Oli & Phoebe have the twin room)']
	},
	{
		id: 'essentials',
		title: 'Sensible essentials',
		items: ['Phone charger and a long cable', 'Medication', 'Toiletries', 'Pyjamas and slippers', 'Bank card (the village is cashless)', 'Paracetamol (for Saturday morning)']
	}
];

// Suggestions for a shared shop. Who buys what isn't decided yet.
export const SHOPPING: { title: string; items: string[] }[] = [
	{ title: 'Lodge basics', items: ['Toilet roll', 'Kitchen roll', 'Bin bags', 'Washing-up liquid', 'Dishwasher tablets', 'Foil and cling film'] },
	{ title: 'Breakfasts', items: ['Bread', 'Butter', 'Bacon', 'Eggs', 'Cereal', 'Milk', 'Juice'] },
	{ title: 'Lunches', items: ['Sandwich fillings', 'Wraps', 'Cheese and ham', 'Salad bits', 'Crisps'] },
	{ title: 'Big nights in', items: ['Pizzas', 'Chilli or curry for a crowd', 'Garlic bread', 'Dips', 'Chocolate', 'Ice'] }
];

// Confirmed facts shown on the page. Each line is something Center Parcs publishes.
export const FACTS: Record<'arrival' | 'parking' | 'lodges' | 'plans' | 'gym' | 'bikes' | 'pool' | 'booking' | 'provided' | 'contact', string[]> = {
	contact: [
		'Questions for Center Parcs (like whether our twin beds really do push together): Guest Services on 01768 893 009.',
		'Manage activity and restaurant bookings in “My Booking” on centerparcs.co.uk or the app.'
	],
	arrival: [
		'Whinfell Forest, Penrith, Cumbria CA10 2DW. Just off M6 junction 40.',
		'The village opens at 10am on Friday. Collect wristbands (lodge key and pool locker key) at the Arrivals Lodge.',
		'Lodge access from 4pm for Woodland Lodges, 3pm for Forest Lodges, 2pm for Exclusive Lodges.',
		'Monday: out of the lodge by 10am. You can stay in the village until midnight.'
	],
	parking: [
		'The village is car-free. Drive to your lodge to unload once it’s open, then take the car to the car park by 10pm.',
		'Monday: you can drive to the lodge before 10am to load up.',
		'Exclusive Lodges have their own parking nearby.'
	],
	lodges: [
		'Bed linen, lodge towels, a hairdryer, and a cot and highchair are in every lodge. Cot linen isn’t.',
		'Kitchens have the basics, a few dishwasher tablets and a little tea and coffee. Each lodge has a barbecue.',
		'No laundry on site.'
	],
	plans: [
		'Activities, restaurants and the spa open for booking 12 weeks before arrival (around Christmas Day 2026). Check “My Booking”.',
		'Most activities take 6–8 people, so we’ll split into teams.'
	],
	gym: ['The gym has cardio and resistance machines (no free weights) and is 16+. A gym pass covers the stay.'],
	bikes: ['From the Cycle Centre: adult bikes, tandems, e-bikes and trailers. Helmets and locks are free.', 'You can bring your own bikes instead.'],
	pool: ['Open 9am–8pm, heated to 29.5°C. Tropical Cyclone, Canyon Ride, indoor rapids, a wave pool and an outdoor pool.', 'Free buoyancy aids. Bring swim nappies for Theo.'],
	booking: [
		'Bookings open 12 weeks before arrival, around Christmas Day 2026. Popular activities and early tables go fast.',
		'Thirteen or more at a restaurant is a “group request” the restaurant has to approve. Book the whole party as one booking.',
		'Add everyone’s email to the booking so we can all see one shared itinerary.',
		'Restaurant bookings take a small refundable deposit.'
	],
	provided: [
		'Bed linen and lodge towels, a hairdryer, a cot and highchair, and the kitchen basics.',
		'Not provided: pool towels and cot linen.'
	]
};
