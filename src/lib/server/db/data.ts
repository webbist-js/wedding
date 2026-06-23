// Typed seed data ported from the original single-file Wedding Dashboard.
// Source: Wedding_Dashboard.html (GUESTS / QUOTE_DEFAULT / VENDORS / TIMELINE /
// BUDGET_DEFAULT / STATIONERY). Field names align to src/lib/server/db/schema.ts.

export type Side = 'G' | 'B' | 'X';
export type AttendanceType = 'day' | 'evening';

export interface SeedGuest {
  name: string;
  side: Side;
  relationshipGroup: string;
  relation?: string;
  role?: string;
  attendanceType: AttendanceType;
  meal?: 'veg' | 'non-veg'; // pre-known dietary from source
  dietaryNotes?: string; // for non-veg/non-toggle dietary like pescatarian
  isChild?: boolean;
  isPlusOne?: boolean; // placeholder slot to be named on the RSVP page
  inviteGroup: string; // household key — guests sharing this get ONE QR
}

export interface SeedQuoteLine {
  label: string;
  section: string;
  scope: 'day' | 'eve' | 'fixed' | 'custom';
  price: number;
  qty?: number;
  included?: boolean;
  confirmed?: boolean;
  bond?: boolean;
}

export interface SeedSupplier {
  category: string;
  name?: string;
  contact?: string;
  status: string;
  notes?: string;
}

export interface SeedPhase {
  title: string;
  window: string;
  items: { label: string; done: boolean }[];
}

export type BudgetSection = 'Essentials' | 'Décor & flowers' | 'Stationery' | 'Favours' | 'Everything else';

export const BUDGET_SECTIONS: BudgetSection[] = [
  'Essentials',
  'Décor & flowers',
  'Stationery',
  'Favours',
  'Everything else'
];

export interface SeedBudgetLine {
  category: string;
  section: BudgetSection;
  budgeted: number;
  confirmed: number;
  paid: number;
  status: string;
}

// Relationship group labels (from the source GUESTS group constants).
const G_FAM = "Groom's family";
const B_FAM = "Bride's family";
const G_FR = "Groom's party & friends";
const G_WK = "Groom's work";
const B_FR = "Bride's friends";
const B_WKF = "Bride's work";
const B_WK = "Bride's work";
const NB = 'Neighbours';
const EVE = 'Evening guests';

export const SEED_GUESTS: SeedGuest[] = [
  // --- Groom's family ---
  { name: 'Janet Bennett', side: 'G', relationshipGroup: G_FAM, relation: "Alex's mother", attendanceType: 'day', inviteGroup: 'janet-bennett' },
  { name: 'Chris Bennett', side: 'G', relationshipGroup: G_FAM, relation: "Alex's brother", role: 'Best Man', attendanceType: 'day', inviteGroup: 'chris-hayley-bennett' },
  { name: 'Hayley Bennett', side: 'G', relationshipGroup: G_FAM, relation: "Chris's wife", role: 'Bridesmaid', attendanceType: 'day', inviteGroup: 'chris-hayley-bennett' },
  { name: 'Theo', side: 'G', relationshipGroup: G_FAM, relation: "Chris & Hayley's baby", attendanceType: 'day', isChild: true, inviteGroup: 'chris-hayley-bennett' },

  // --- Bride's family ---
  { name: 'Malcolm Jones', side: 'B', relationshipGroup: B_FAM, relation: "Katie's father figure", attendanceType: 'day', inviteGroup: 'malcolm-monica' },
  { name: 'Monica', side: 'B', relationshipGroup: B_FAM, relation: "Malcolm's partner", attendanceType: 'day', inviteGroup: 'malcolm-monica' },
  { name: 'Peter Sherdley', side: 'B', relationshipGroup: B_FAM, relation: "Katie's grandad", attendanceType: 'day', inviteGroup: 'peter-sherdley' },
  { name: 'David Sherdley', side: 'B', relationshipGroup: B_FAM, relation: "Katie's uncle", attendanceType: 'day', inviteGroup: 'david-wendy-sherdley' },
  { name: 'Wendy Sherdley', side: 'B', relationshipGroup: B_FAM, relation: "Katie's auntie", attendanceType: 'day', inviteGroup: 'david-wendy-sherdley' },
  { name: 'Joshua Sherdley', side: 'B', relationshipGroup: B_FAM, relation: "Katie's cousin", attendanceType: 'day', inviteGroup: 'joshua-sherdley' },
  { name: 'Joshua +1', side: 'B', relationshipGroup: B_FAM, relation: "Joshua's guest", attendanceType: 'day', isPlusOne: true, inviteGroup: 'joshua-sherdley' },
  { name: 'Liam Sherdley', side: 'B', relationshipGroup: B_FAM, relation: "Katie's cousin", attendanceType: 'day', inviteGroup: 'liam-sherdley' },
  { name: 'Kathryn Smith', side: 'B', relationshipGroup: B_FAM, relation: "Katie's great-aunt", attendanceType: 'day', inviteGroup: 'kathryn-peter-smith' },
  { name: 'Peter Smith', side: 'B', relationshipGroup: B_FAM, relation: "Katie's great-uncle", attendanceType: 'day', inviteGroup: 'kathryn-peter-smith' },
  { name: 'Tom Gledhill', side: 'B', relationshipGroup: B_FAM, relation: "Katie's uncle", attendanceType: 'evening', inviteGroup: 'tom-lisa-gledhill' },
  { name: 'Lisa Polinger', side: 'B', relationshipGroup: B_FAM, relation: "Tom's partner", attendanceType: 'evening', inviteGroup: 'tom-lisa-gledhill' },
  { name: 'Florie Gledhill', side: 'B', relationshipGroup: B_FAM, relation: "Tom & Lisa's daughter", attendanceType: 'evening', isChild: true, inviteGroup: 'tom-lisa-gledhill' },
  { name: 'Sandra Gledhill', side: 'B', relationshipGroup: B_FAM, relation: "Katie's grandmother", attendanceType: 'evening', inviteGroup: 'sandra-gledhill' },

  // --- Groom's party & friends ---
  { name: 'Kiran Philips', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", role: 'Groomsman', attendanceType: 'day', inviteGroup: 'kiran-elisa-philips' },
  { name: 'Elisa Philips', side: 'G', relationshipGroup: G_FR, relation: "Kiran's wife", role: 'Bridesmaid', attendanceType: 'day', inviteGroup: 'kiran-elisa-philips' },
  { name: 'Oliver Brierley', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", role: 'Groomsman', attendanceType: 'day', inviteGroup: 'oliver-pheobe-brierley' },
  { name: 'Pheobe', side: 'G', relationshipGroup: G_FR, relation: "Oliver's wife", role: 'Bridesmaid', attendanceType: 'day', inviteGroup: 'oliver-pheobe-brierley' },
  { name: 'Chris Todd', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", role: 'Groomsman', attendanceType: 'day', inviteGroup: 'chris-jen-todd' },
  { name: 'Jen Todd', side: 'G', relationshipGroup: G_FR, relation: "Chris Todd's wife", role: 'Bridesmaid', attendanceType: 'day', inviteGroup: 'chris-jen-todd' },
  { name: 'Stephen McCarroll', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", attendanceType: 'day', inviteGroup: 'stephen-mccarroll-alice-barrel' },
  { name: 'Alice Barrel', side: 'G', relationshipGroup: G_FR, relation: "Stephen's partner", attendanceType: 'day', inviteGroup: 'stephen-mccarroll-alice-barrel' },
  { name: 'Arlo', side: 'G', relationshipGroup: G_FR, relation: "Stephen & Alice's son", attendanceType: 'day', isChild: true, inviteGroup: 'stephen-mccarroll-alice-barrel' },
  { name: 'Sam Rycroft', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", attendanceType: 'day', inviteGroup: 'sam-rycroft' },
  { name: "Sam's Plus One", side: 'G', relationshipGroup: G_FR, relation: "Sam's guest", attendanceType: 'day', isPlusOne: true, inviteGroup: 'sam-rycroft' },
  { name: 'Jade', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", attendanceType: 'day', inviteGroup: 'jade-tom' },
  { name: 'Tom', side: 'G', relationshipGroup: G_FR, relation: "Jade's partner", attendanceType: 'day', inviteGroup: 'jade-tom' },
  { name: 'Dan Grady', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", attendanceType: 'day', inviteGroup: 'dan-zoe-grady' },
  { name: 'Zoe Grady', side: 'G', relationshipGroup: G_FR, relation: "Dan's partner", attendanceType: 'day', inviteGroup: 'dan-zoe-grady' },
  { name: 'Nicholas Finch', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend", attendanceType: 'day', inviteGroup: 'nicholas-finch' },
  { name: 'Nick Partner', side: 'G', relationshipGroup: G_FR, relation: "Nick's partner", attendanceType: 'day', isPlusOne: true, inviteGroup: 'nicholas-finch' },
  { name: "Sam (Oliver's brother)", side: 'G', relationshipGroup: G_FR, relation: "Oliver's brother · Alex's friend · Kieran's partner", meal: 'veg', attendanceType: 'day', inviteGroup: 'sam-kieran' },
  { name: 'Kieran', side: 'G', relationshipGroup: G_FR, relation: "Sam's partner", attendanceType: 'day', inviteGroup: 'sam-kieran' },
  { name: 'Jamie-Leigh', side: 'G', relationshipGroup: G_FR, relation: "Kieran's sister · friend", attendanceType: 'day', inviteGroup: 'jamie-leigh' },
  { name: 'Alistar Brierley', side: 'G', relationshipGroup: G_FR, relation: "Alex's friend (Brierley)", meal: 'veg', attendanceType: 'day', inviteGroup: 'alistar-raya' },
  { name: 'Raya', side: 'G', relationshipGroup: G_FR, relation: "Alistar's partner", attendanceType: 'day', inviteGroup: 'alistar-raya' },
  { name: 'Helena', side: 'G', relationshipGroup: G_FR, relation: "Brierley sibling · Alex's friend", attendanceType: 'day', inviteGroup: 'helena' },
  { name: "Helena's Plus One", side: 'G', relationshipGroup: G_FR, relation: "Helena's guest", attendanceType: 'day', isPlusOne: true, inviteGroup: 'helena' },
  { name: 'Allison', side: 'G', relationshipGroup: G_FR, relation: "Brierleys' mum · friend of Alex & Janet", dietaryNotes: 'Pescatarian', attendanceType: 'day', inviteGroup: 'allison' },
  { name: 'Suma', side: 'G', relationshipGroup: G_FR, relation: "Kiran's mum · Alex's friend", attendanceType: 'day', inviteGroup: 'suma' },
  { name: 'Kevin Philips', side: 'G', relationshipGroup: G_FR, relation: "Kiran's brother", attendanceType: 'day', inviteGroup: 'kevin-philips-anna-b' },
  { name: 'Anna B', side: 'G', relationshipGroup: G_FR, relation: "Kevin's partner", attendanceType: 'day', inviteGroup: 'kevin-philips-anna-b' },

  // --- Groom's work ---
  { name: 'Rosie (Strapi)', side: 'G', relationshipGroup: G_WK, relation: "Alex's work colleague", attendanceType: 'day', inviteGroup: 'rosie-fran' },
  { name: 'Francesco Lorusso', side: 'G', relationshipGroup: G_WK, relation: "Rosie's partner", attendanceType: 'day', inviteGroup: 'rosie-fran' },
  { name: 'Kellan (Strapi)', side: 'G', relationshipGroup: G_WK, relation: "Alex's work colleague", attendanceType: 'day', inviteGroup: 'kellan' },

  // --- Bride's friends ---
  { name: 'Jonathan Ward', side: 'B', relationshipGroup: B_FR, relation: "Katie's friend", attendanceType: 'day', inviteGroup: 'jonathan-ward-laura' },
  { name: 'Laura', side: 'B', relationshipGroup: B_FR, relation: "Jonathan's partner", attendanceType: 'day', inviteGroup: 'jonathan-ward-laura' },
  { name: 'Luke McNicol', side: 'B', relationshipGroup: B_FR, relation: "Katie's friend", attendanceType: 'day', inviteGroup: 'luke-mcnicol-anna' },
  { name: 'Anna', side: 'B', relationshipGroup: B_FR, relation: "Luke's partner", attendanceType: 'day', inviteGroup: 'luke-mcnicol-anna' },
  { name: 'Rose Holt', side: 'B', relationshipGroup: B_FR, relation: "Katie's friend", attendanceType: 'day', inviteGroup: 'rose-holt-ben-newman' },
  { name: 'Ben Newman', side: 'B', relationshipGroup: B_FR, relation: "Rose's partner", attendanceType: 'day', inviteGroup: 'rose-holt-ben-newman' },
  { name: 'Adam Seaton Shaw', side: 'B', relationshipGroup: B_FR, relation: 'Man of Honour', role: 'Man of Honour', attendanceType: 'day', inviteGroup: 'adam-lysanne-seaton-shaw' },
  { name: 'Lysanne Seaton Shaw', side: 'B', relationshipGroup: B_FR, relation: "Adam's wife", role: 'Bridesmaid', attendanceType: 'day', inviteGroup: 'adam-lysanne-seaton-shaw' },

  // --- Bride's work friends ---
  { name: 'Karma Hirst', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'day', inviteGroup: 'karma-hirst' },
  { name: 'Connor', side: 'B', relationshipGroup: B_WKF, relation: "Karma's partner", attendanceType: 'day', inviteGroup: 'karma-hirst' },
  { name: 'Dom Doherty', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'day', inviteGroup: 'dom-doherty' },
  { name: 'Mairi', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'day', inviteGroup: 'mairi' },
  { name: 'Sharon Kirk', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'day', inviteGroup: 'sharon-kirk' },
  { name: 'Simon Cambridge', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'day', inviteGroup: 'simon-cambridge' },
  { name: 'Alex Lilley', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'evening', inviteGroup: 'alex-kat-lilley' },
  { name: 'Kat Lilley', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'evening', inviteGroup: 'alex-kat-lilley' },
  { name: 'Domanic Meredith', side: 'B', relationshipGroup: B_WKF, relation: "Katie's work friend", attendanceType: 'evening', inviteGroup: 'domanic-meredith' },

  // --- Bride's work colleagues ---
  { name: 'Daniel King', side: 'B', relationshipGroup: B_WK, relation: "Katie's work colleague", attendanceType: 'day', inviteGroup: 'daniel-king-rika' },
  { name: 'Rika', side: 'B', relationshipGroup: B_WK, relation: "Daniel's partner", attendanceType: 'day', inviteGroup: 'daniel-king-rika' },
  { name: 'Grace', side: 'B', relationshipGroup: B_WK, relation: 'Dan & Rika\'s daughter (baby)', attendanceType: 'day', isChild: true, inviteGroup: 'daniel-king-rika' },

  // --- Neighbours ---
  { name: 'Tony', side: 'X', relationshipGroup: NB, relation: "Katie & Alex's neighbour", attendanceType: 'day', inviteGroup: 'tony-susan' },
  { name: 'Susan', side: 'X', relationshipGroup: NB, relation: 'Neighbour', attendanceType: 'day', inviteGroup: 'tony-susan' },

  // --- Evening — Bride's work ---
  { name: 'Daniel Bayliss', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'daniel-bayliss' },
  { name: 'Lucinda Baker', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'lucinda-baker' },
  { name: 'Geo Goldsbrough', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'geo-goldsbrough' },
  { name: 'Emily Cossey', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'emily-cossey' },
  { name: 'Tori Nash', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'tori-nash' },
  { name: 'Grace Oxley', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'grace-oxley' },
  { name: 'Kim Stringer', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'kim-stringer' },
  { name: 'Marissa Brook', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'marissa-brook' },
  { name: 'Yash Gandhi', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'yash-gandhi' },
  { name: 'Kaydon Fishley', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'kaydon-fishley' },
  { name: 'Adnaan Khan', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'adnaan-khan' },
  { name: 'Donna Wheatley', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'donna-wheatley' },
  { name: 'Caroline Pattison', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'caroline-pattison' },
  { name: 'Lianne Peck', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'lianne-peck' },
  { name: 'Rebecca Sigsworth', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'rebecca-sigsworth' },
  { name: 'Stephen McManus', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'stephen-mcmanus' },
  { name: 'Cija Smith', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'cija-smith' },
  { name: 'Hannah Gamble', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'hannah-gamble' },
  { name: 'Elisha Oldroyd', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'elisha-oldroyd' },
  { name: 'Jamie Taylor', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'jamie-taylor' },
  { name: 'Sam Wignall', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'sam-wignall' },
  { name: 'Nathan Raper', side: 'B', relationshipGroup: EVE, relation: "Katie's work (evening)", attendanceType: 'evening', inviteGroup: 'nathan-raper' }
];

export const SEED_QUOTE: SeedQuoteLine[] = [
  { label: 'Event fee (incl. 3 canapés + 2 drinks pp, staff, crockery, linen, décor)', section: 'Event', scope: 'day', price: 50.0, confirmed: true },
  { label: 'Bottled beer (reception)', section: 'Drinks', scope: 'day', price: 0, included: true },
  { label: 'Prosecco di Valdobbiadene, glass', section: 'Drinks', scope: 'day', price: 0, included: true },
  { label: 'Canapé — halloumi, rosemary & olive oil', section: 'Menu', scope: 'day', price: 0, included: true },
  { label: 'Canapé — honey roasted sausages, spicy ketchup', section: 'Menu', scope: 'day', price: 0, included: true },
  { label: 'Canapé — tomato on toast', section: 'Menu', scope: 'day', price: 0, included: true },
  { label: 'Starter — leek & potato soup, Cashel blue', section: 'Menu', scope: 'day', price: 12.0, confirmed: false },
  { label: 'Main — rotisserie chicken, herb butter / tarragon cream', section: 'Menu', scope: 'day', price: 44.0, confirmed: false },
  { label: 'Side — tender stem broccoli, chilli & garlic', section: 'Menu', scope: 'day', price: 0, included: true },
  { label: 'Side — gratin dauphinoise', section: 'Menu', scope: 'day', price: 0, included: true },
  { label: 'Dessert — treacle sponge, custard', section: 'Menu', scope: 'day', price: 12.0, confirmed: true },
  { label: 'Tea & coffee (buffet)', section: 'Menu', scope: 'custom', qty: 56, price: 2.4, confirmed: true },
  { label: 'Baz & Fred pizza (evening food)', section: 'Evening food', scope: 'eve', price: 15.0, confirmed: true },
  { label: 'Tithe Barn outdoor package', section: 'Decorations', scope: 'fixed', price: 275.0, confirmed: true },
  { label: 'Venue hire fee', section: 'Hire', scope: 'fixed', price: 2900.0, confirmed: true },
  { label: 'Venue exclusive / reservation fee', section: 'Hire', scope: 'fixed', price: 3750.0, confirmed: true },
  { label: 'Ceremony fee', section: 'Hire', scope: 'fixed', price: 180.0, confirmed: true },
  { label: 'Refundable bond', section: 'Hire', scope: 'fixed', price: 500.0, confirmed: false, bond: true }
];

export const SEED_SUPPLIERS: SeedSupplier[] = [
  { category: 'Venue & Catering', name: 'The Tithe Barn', contact: 'Laura · 01756 631000', status: 'booked', notes: 'Deposit paid. All food in-house. Dog-friendly.' },
  { category: 'Registrar', name: 'North Yorkshire (Skipton)', contact: 'registrars.skipton@northyorks.gov.uk', status: 'booked', notes: '£50 deposit · ref 149599481 · ceremony 2.30pm' },
  { category: 'Photographer', name: 'Adam Lowndes', contact: 'hello@adamlowndes.co.uk', status: 'booked', notes: 'Confirmed' },
  { category: 'Photographer (alt)', name: 'Hamish Irvine', contact: 'info@hamishirvine.com', status: 'short', notes: "Shoots the venue's own gallery" },
  { category: 'Florist', name: 'Bureau Botany / Flowers in my Head / Yorkshire Floral Co', contact: 'hello@bureaubotany.co.uk', status: 'short', notes: 'Shortlist — to book' },
  { category: 'Music / DJ', name: 'Mark Green / Dom Wood', contact: '07865 050212', status: 'short', notes: 'Shortlist — to book' },
  { category: 'Hair & Makeup', name: 'Immy May', contact: 'immymay.co.uk', status: 'short', notes: 'Book + trial' },
  { category: 'Cake', name: 'Little Cake', contact: 'littlecake.co.uk', status: 'short', notes: 'Shortlist' },
  { category: 'Transport', name: 'Yorkshire Wedding Car Co', contact: '—', status: 'short', notes: 'Shortlist' },
  { category: 'Accommodation', name: 'The Devonshire Arms', contact: '01756 718111', status: 'short', notes: 'Guest block-booking' },
  { category: 'Wedding rings', name: "Forge & Lumber (Alex) + Katie's", contact: 'info@forgeandlumber.com', status: 'booked', notes: "Alex: £240, size P. Katie's bought. Both complete." },
  { category: 'Confetti', name: 'Wedfetti / Confetti Bee', contact: '—', status: 'short', notes: 'Fresh petals only (venue rule)' },
  { category: 'Dog handler', name: 'Yorkshire Paws & Co', contact: '—', status: 'todo', notes: 'Optional — for Bodie' },
  { category: 'Magician', name: 'Oliver Parker (Leeds Magician)', contact: '—', status: 'todo', notes: 'Maybe' },
  { category: 'Attire', name: 'Stacees / Azazie (bridesmaids), groomsmen, Bodie outfit', contact: '—', status: 'todo', notes: 'Dusty rose theme' },
  { category: 'Stationery / Favours / Décor', name: '—', contact: '—', status: 'todo', notes: 'To research' }
];

export const SEED_TIMELINE: SeedPhase[] = [
  {
    title: 'Already booked',
    window: 'June 2026',
    items: [
      { label: 'Budget & tracker started', done: true },
      { label: 'Guest list drafted (~90)', done: true },
      { label: 'Venue — Tithe Barn (deposit)', done: true },
      { label: 'Registrar — 2 Apr 2027, 2.30pm (£50 deposit)', done: true },
      { label: 'Photographer — Adam Lowndes', done: true },
      { label: 'Wedding rings — Katie & Alex (both bought)', done: true }
    ]
  },
  {
    title: 'Do next — priority',
    window: 'Summer–Autumn 2026',
    items: [
      { label: 'Book a planning meeting with the Tithe Barn (~9 months out)', done: false },
      { label: 'Set an Oct 2026 reminder to book the Bradford Notice of Marriage', done: false },
      { label: 'Confirm soup & main per-head prices + minimum-spend rule with Laura', done: false },
      { label: 'Take out wedding insurance', done: false },
      { label: 'Book DJ, florist, hair & makeup', done: false },
      { label: 'Dress / suit shopping', done: false },
      { label: 'Confirm wedding party & outfits', done: false },
      { label: 'Research honeymoon', done: false }
    ]
  },
  {
    title: '6–7 months out',
    window: 'Sep–Oct 2026',
    items: [
      { label: 'Finalise guest list & addresses', done: false },
      { label: 'Send save-the-dates', done: false },
      { label: 'Book cake & confetti (fresh petals)', done: false },
      { label: 'Block-book guest accommodation', done: false },
      { label: 'Gift list / registry', done: false },
      { label: 'Book a venue Feast Night to taste menu', done: false }
    ]
  },
  {
    title: '4–5 months out',
    window: 'Nov–Dec 2026',
    items: [
      { label: 'Order invitations & stationery', done: false },
      { label: 'Personalise ceremony in NY account', done: false },
      { label: 'Pay NY ceremony balance (by 2 Jan 2027)', done: false },
      { label: 'Arrange transport', done: false },
      { label: 'Confirm wet-weather plan with venue', done: false },
      { label: "Order 'need to buy' items", done: false }
    ]
  },
  {
    title: '2–3 months out',
    window: 'Jan–Feb 2027',
    items: [
      { label: 'Post invitations', done: false },
      { label: 'Track RSVPs & meal choices', done: false },
      { label: 'Dress fittings', done: false },
      { label: 'Draft wedding-day timeline', done: false },
      { label: 'Finalise décor with florist', done: false },
      { label: 'Venue final balance due ~21 Feb (40 days before)', done: false }
    ]
  },
  {
    title: '1 month & final fortnight',
    window: 'Mar 2027',
    items: [
      { label: 'Confirm final numbers with venue (8 wks before; changes up to 6 wks)', done: false },
      { label: 'Finalise seating plan', done: false },
      { label: 'Share day-of timeline with suppliers', done: false },
      { label: 'Write vows / speeches', done: false },
      { label: 'Emergency kit & final payments', done: false }
    ]
  }
];

// Budget — figures from BUDGET_DEFAULT. Status derived from the source's
// bStatus(confirmed, paid): paid>=confirmed&&confirmed>0 -> Paid;
// confirmed>0&&paid>0 -> Deposit; confirmed>0 -> Booked; else -> Estimate.
export const VENUE_BUDGET_CATEGORY = 'Venue & catering';

export const SEED_BUDGET: SeedBudgetLine[] = [
  { category: VENUE_BUDGET_CATEGORY, section: 'Essentials', budgeted: 17320, confirmed: 17319.4, paid: 0, status: 'Booked' },
  { category: 'Photography — Adam Lowndes', section: 'Essentials', budgeted: 2750, confirmed: 2750, paid: 400, status: 'Deposit' },
  { category: 'Wedding rings', section: 'Essentials', budgeted: 240, confirmed: 240, paid: 240, status: 'Paid' },
  { category: 'Ceremony & notice fees', section: 'Essentials', budgeted: 134, confirmed: 134, paid: 50, status: 'Deposit' },
  { category: 'Wedding insurance', section: 'Essentials', budgeted: 80, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: "Bride's dress & accessories", section: 'Essentials', budgeted: 1500, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Groom & groomsmen attire', section: 'Essentials', budgeted: 800, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Bridesmaid dresses', section: 'Essentials', budgeted: 600, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Hair & makeup', section: 'Essentials', budgeted: 600, confirmed: 0, paid: 0, status: 'Estimate' },

  { category: 'Florist & flowers', section: 'Décor & flowers', budgeted: 1500, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Décor & styling', section: 'Décor & flowers', budgeted: 800, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Confetti (fresh petals)', section: 'Décor & flowers', budgeted: 80, confirmed: 0, paid: 0, status: 'Estimate' },

  { category: 'Stationery', section: 'Stationery', budgeted: 500, confirmed: 0, paid: 0, status: 'Estimate' },

  { category: 'Favours', section: 'Favours', budgeted: 200, confirmed: 0, paid: 0, status: 'Estimate' },

  { category: 'Music / DJ', section: 'Everything else', budgeted: 600, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Cake', section: 'Everything else', budgeted: 350, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Magician', section: 'Everything else', budgeted: 400, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Dog handler (Bodie)', section: 'Everything else', budgeted: 250, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Transport', section: 'Everything else', budgeted: 400, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: "Couple's accommodation", section: 'Everything else', budgeted: 400, confirmed: 0, paid: 0, status: 'Estimate' },
  { category: 'Contingency (~5%)', section: 'Everything else', budgeted: 1500, confirmed: 0, paid: 0, status: 'Estimate' }
];

export const SEED_STATIONERY: string[] = [
  'Save-the-dates',
  'Day invitations',
  'Evening invitations',
  'RSVP cards or online RSVP',
  'Details / info cards',
  'Envelopes & postage',
  'Order of the day / service',
  'Menu cards',
  'Place name cards',
  'Table names or numbers',
  'Table plan display',
  'Welcome sign',
  'Signage',
  'Guestbook',
  'Card postbox',
  'Thank-you cards',
  'Confetti cones / favour tags / cake topper'
];

export const SEED_SETTINGS: Record<string, string> = {
  target: '30000',
  dayGuests: '61',
  eveGuests: '90',
  minSpend: '16455',
  tableCount: '7',
  seatMode: 'day'
};
