// Static wedding-day information shown on the public RSVP page.

export const WEDDING = {
	coupleName: 'Katie & Alex',
	dateLong: 'Friday 2 April 2027',
	ceremonyTime: '2.30pm',
	venueName: 'The Tithe Barn',
	venueArea: 'Bolton Abbey · Yorkshire Dales',
	venuePostcode: 'BD23 6EX',
	venueWebsite: 'https://crippsandco.com/the-tithe-barn',
	// RSVP deadline derived from the venue's "final numbers 8 weeks before"
	// requirement — set ~10 weeks before so the couple has time to chase
	// non-responders before confirming to the venue.
	rsvpDeadline: 'Friday 22 January 2027',
	// Phrased as direct asks rather than soft suggestions — guests respond better
	// to a clear request than a polite hint.
	formalities: {
		dressCode: {
			label: 'Dress Code',
			headline: 'Wear your wedding best',
			body: "We'd love to see everyone in smart, formal attire — leave the jeans and casual trainers at home."
		},
		unplugged: {
			label: 'An unplugged ceremony',
			headline: 'Be present with us',
			body: "We've hired a wonderful professional photographer to capture every moment, so please tuck phones and cameras away during the ceremony. We'd love to see your faces — not your screens — when we say I do."
		}
	},
	contact: {
		email: 'hello@sherdley-bennett.wedding',
		phone: '07514 279404'
	},
	mapEmbed:
		'https://www.openstreetmap.org/export/embed.html?bbox=-1.910%2C53.978%2C-1.872%2C53.992&layer=mapnik&marker=53.984%2C-1.891',
	mapLink: 'https://www.google.com/maps?q=The+Tithe+Barn+Bolton+Abbey+BD23+6EX',
	paypalLink: 'https://www.paypal.com/paypalme/alexkatie-honeymoon' // placeholder
};

export const CEREMONY_TIMETABLE = [
	{ time: '2.00 pm', what: 'Guests arrive' },
	{ time: '2.30 pm', what: 'Ceremony' },
	{ time: '3.00 pm', what: 'Drinks reception & canapés' },
	{ time: '5.00 pm', what: 'Wedding breakfast' },
	{ time: '7.30 pm', what: 'Speeches & cake' },
	{ time: '8.00 pm', what: 'Evening guests arrive · Baz & Fred pizza', evening: true },
	{ time: '9.00 pm', what: 'First dance · dancing', evening: true },
	{ time: '12.30 am', what: 'Last orders', evening: true },
	{ time: '1.00 am', what: 'Carriages', evening: true }
];

export const MENU = {
	canapes: [
		'Halloumi, rosemary & olive oil',
		'Honey roasted sausages, spicy ketchup',
		'Tomato on toast'
	],
	starter: 'Leek & potato soup, Cashel blue',
	main: 'Rotisserie chicken with herb butter & tarragon cream',
	mainVeg: 'Roasted squash, ricotta, chilli, pesto',
	sides: ['Tender stem broccoli, chilli & garlic', 'Gratin dauphinoise'],
	dessert: 'Treacle sponge, custard',
	teaCoffee: 'Tea & coffee with petits fours',
	evening: 'Baz & Fred wood-fired pizza, handmade on site — served to everyone in the evening',
	drinks: 'Welcome prosecco · bottled beers · full bar',
	kids: "A children's menu (with a vegetarian option) will be served — let us know any allergies on your RSVP"
};

export const ACCOMMODATION = [
	{
		name: 'The Devonshire Arms',
		note: 'On the Bolton Abbey estate, a short stroll from the barn. We are staying here on the night.',
		phone: '01756 718111',
		url: 'https://thedevonshirearms.co.uk/'
	},
	{
		name: 'The Devonshire Fell',
		note: 'Sister hotel on the estate, a short drive away.',
		phone: '01756 729000',
		url: 'https://boltonabbeyescapes.co.uk/fell-hotel/'
	},
	{
		name: 'Holiday cottages on the estate',
		note: 'Meadowcroft (sleeps 8) and Norwood Cottage (sleeps 4) are 1–2 miles away — good for families or groups.',
		url: 'https://boltonabbey.com/stay/'
	},
	{
		name: 'Premier Inn Skipton North (Gargrave)',
		note: 'Chain budget hotel a 15-minute drive away, just outside Skipton in Gargrave.',
		phone: '0871 527 8980',
		url: 'https://www.premierinn.com/gb/en/hotels/england/north-yorkshire/skipton/skipton-north-gargrave.html'
	}
];

export const TAXIS = [
	{ name: 'Station Taxis Skipton', phone: '01756 700777' },
	{ name: 'Skipton & Craven Taxis', phone: '01756 794444' },
	{ name: 'Transport Connect Taxis', phone: '01756 520124' }
];

export const TRAVEL = {
	station: 'Skipton (about 6 miles away — direct trains from Leeds, around 45 minutes).',
	parking:
		'Extensive on-site parking at the Tithe Barn. Cars can be left overnight and collected by 10am the next morning.',
	driveFromSkipton: 'A 15-minute drive from Skipton along the A59 / B6160.'
};

export const GIFTS = {
	headline: 'Your presence is the gift.',
	body:
		"If you'd like to give something more, we're saving for our honeymoon — you can contribute via PayPal, or hand us cash on the day."
};
