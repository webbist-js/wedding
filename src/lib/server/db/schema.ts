import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const inviteGroups = sqliteTable('invite_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Stable key derived from the seed source — lets reseeds match existing rows
  // by identity rather than wiping & re-creating (which would regenerate tokens
  // and lose RSVP data). Nullable so older rows can be backfilled.
  seedKey: text('seed_key').unique(),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  // Note FROM guests TO couple — written via the RSVP page.
  message: text('message'),
  // Note FROM couple TO this household — shown at the top of their RSVP page.
  personalMessage: text('personal_message'),
  // Household-level allergies / dietary notes captured under the menu section.
  allergiesNote: text('allergies_note'),
  // Optional song request from the household — passed on to the DJ.
  songRequest: text('song_request'),
  // Guest-CRM contact details (admin-only, edited from the dashboard guest list).
  address: text('address'),
  email: text('email'),
  phone: text('phone'),
  respondedAt: integer('responded_at', { mode: 'timestamp' })
});

export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => inviteGroups.id),
  // Stable seed identity — see inviteGroups.seedKey.
  seedKey: text('seed_key').unique(),
  name: text('name').notNull(),
  side: text('side', { enum: ['G', 'B', 'X'] }).notNull(),
  relationshipGroup: text('relationship_group').notNull(),
  relation: text('relation'),
  role: text('role'),
  attendanceType: text('attendance_type', { enum: ['day', 'evening'] }).notNull(),
  isChild: integer('is_child', { mode: 'boolean' }).notNull().default(false),
  // True for unnamed "+1" placeholder rows — the host fills in the actual name on the RSVP page.
  isPlusOne: integer('is_plus_one', { mode: 'boolean' }).notNull().default(false),
  rsvpStatus: text('rsvp_status', { enum: ['pending', 'yes', 'no'] }).notNull().default('pending'),
  meal: text('meal', { enum: ['veg', 'non-veg'] }),
  dietaryNotes: text('dietary_notes')
});

export const budgetLines = sqliteTable('budget_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  section: text('section').notNull().default('Everything else'),
  budgeted: real('budgeted').notNull().default(0),
  confirmed: real('confirmed').notNull().default(0),
  paid: real('paid').notNull().default(0),
  status: text('status').notNull().default('todo'),
  sort: integer('sort').notNull().default(0)
});

export const timelinePhases = sqliteTable('timeline_phases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  window: text('window'),
  sort: integer('sort').notNull().default(0)
});

export const timelineItems = sqliteTable('timeline_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phaseId: integer('phase_id').notNull().references(() => timelinePhases.id),
  label: text('label').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  // ISO date string (YYYY-MM-DD). When set, the daily scheduler fires Slack
  // reminders one week before, the day before, on the day, and once overdue.
  dueDate: text('due_date'),
  // Comma-separated list of which thresholds we've already notified about
  // ('week' | 'day' | 'day-of' | 'overdue'). Resets when due_date changes.
  notificationsSent: text('notifications_sent').notNull().default(''),
  sort: integer('sort').notNull().default(0)
});

export const vendors = sqliteTable('vendors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  name: text('name'),
  // Freeform legacy contact line, kept alongside the structured fields below.
  contact: text('contact'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  address: text('address'),
  // CRM pipeline: Lead | Enquired | Quoted | Shortlisted | Booked.
  stage: text('stage').notNull().default('Lead'),
  quotedAmount: real('quoted_amount'),
  depositAmount: real('deposit_amount'),
  // The "chosen supplier" tickbox: deposit paid => this is a booked supplier.
  depositPaid: integer('deposit_paid', { mode: 'boolean' }).notNull().default(false),
  followUpDate: text('follow_up_date'), // ISO YYYY-MM-DD
  priority: integer('priority').notNull().default(2), // 1 high … 3 low
  description: text('description'),
  notes: text('notes'),
  sort: integer('sort').notNull().default(0)
});

// Appointments / bookings, shown on the dashboard calendar. Optionally tied to a
// supplier so a supplier's meetings show on both the calendar and the supplier row.
export const appointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  date: text('date').notNull(), // ISO date YYYY-MM-DD
  time: text('time'), // optional, freeform e.g. "2.30pm"
  location: text('location'),
  notes: text('notes'),
  vendorId: integer('vendor_id').references(() => vendors.id),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  // Comma-separated reminder thresholds already sent ('week' | 'day' | 'day-of').
  notificationsSent: text('notifications_sent').notNull().default('')
});

export const seatAssignments = sqliteTable('seat_assignments', {
  guestId: integer('guest_id').primaryKey().references(() => guests.id),
  tableNo: integer('table_no').notNull(),
  // Specific seat position at that table (1..table.seats). Null = at the table
  // but no fixed seat yet (overflow / legacy "sit anywhere" assignment).
  seatNo: integer('seat_no')
});

// Each physical table in the room. `number` is the stable identifier referenced
// by seatAssignments.tableNo (and the couple's seat settings); `kind` selects an
// arrangement (round / long / square / sweetheart / head) and `seats` is its
// capacity, so the dashboard can model layouts beyond a fixed 10-per-round-table.
export const seatingTables = sqliteTable('seating_tables', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  number: integer('number').notNull(),
  label: text('label'),
  kind: text('kind').notNull().default('round'),
  seats: integer('seats').notNull().default(10),
  sort: integer('sort').notNull().default(0),
  // Floor-plan placement: position as a percentage of the room (0..100) and
  // rotation in degrees. Null position = auto-arranged in a grid by the UI.
  posX: real('pos_x'),
  posY: real('pos_y'),
  rotation: integer('rotation').notNull().default(0)
});

export const quoteLines = sqliteTable('quote_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  section: text('section').notNull(),
  scope: text('scope', { enum: ['day', 'eve', 'fixed', 'custom'] }).notNull(),
  price: real('price').notNull().default(0),
  qty: integer('qty'),
  included: integer('included', { mode: 'boolean' }).notNull().default(false),
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
  bond: integer('bond', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0)
});

export const stationeryItems = sqliteTable('stationery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0)
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});

// Shopping list — ad-hoc things to buy, each with a unit cost and quantity.
// Its running total feeds the budget as a synced "Shopping list" line.
export const shoppingItems = sqliteTable('shopping_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  qty: integer('qty').notNull().default(1),
  cost: real('cost').notNull().default(0), // unit cost
  bought: integer('bought', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  sort: integer('sort').notNull().default(0)
});

// Free-form notes. A note always belongs to a `category` (the dashboard section
// it's filed under in the Notes hub). It may optionally cross-link to a specific
// row elsewhere in the dashboard via (entityType, entityId) — e.g. a note tied
// to one supplier. That's the one-to-many bit: an entity (a supplier, a budget
// line…) can have many notes, each of which also surfaces in the Notes hub under
// its category. A null entityType is a standalone note filed under `category`.
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  body: text('body').notNull(),
  // Section grouping in the Notes hub: General | Venue | Budget | Guests |
  // Seating | Suppliers | Calendar | Timeline | Invites | Stationery.
  category: text('category').notNull().default('General'),
  // Cross-link to a dashboard entity. entityType names the section/table
  // ('supplier' | 'budget' | 'guest_group' | 'timeline' | 'venue'…), entityId
  // its row id. Both null for a standalone note.
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  authorId: integer('author_id').references(() => users.id),
  lastEditedById: integer('last_edited_by_id').references(() => users.id)
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(), // 'alex' | 'katie'
  name: text('name').notNull()
});

export const noteComments = sqliteTable('note_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noteId: integer('note_id').notNull().references(() => notes.id),
  authorId: integer('author_id').references(() => users.id),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
});

// Append-only log of dashboard mutations, surfaced on the Activity page.
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id), // null = system/cron
  action: text('action').notNull(), // 'create' | 'update' | 'delete'
  entity: text('entity').notNull(), // 'vendor' | 'note' | 'comment' | …
  entityId: integer('entity_id'),
  summary: text('summary').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
});
