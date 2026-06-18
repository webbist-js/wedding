import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const inviteGroups = sqliteTable('invite_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  token: text('token').notNull().unique(),
  // Note FROM guests TO couple — written via the RSVP page.
  message: text('message'),
  // Note FROM couple TO this household — shown at the top of their RSVP page.
  personalMessage: text('personal_message'),
  // Household-level allergies / dietary notes captured under the menu section.
  allergiesNote: text('allergies_note'),
  respondedAt: integer('responded_at', { mode: 'timestamp' })
});

export const guests = sqliteTable('guests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => inviteGroups.id),
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
  sort: integer('sort').notNull().default(0)
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  name: text('name'),
  contact: text('contact'),
  status: text('status').notNull().default('todo'),
  notes: text('notes'),
  sort: integer('sort').notNull().default(0)
});

export const seatAssignments = sqliteTable('seat_assignments', {
  guestId: integer('guest_id').primaryKey().references(() => guests.id),
  tableNo: integer('table_no').notNull()
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
