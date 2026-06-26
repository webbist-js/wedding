import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { notes, noteComments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isNoteCategory, isEntityType, categoryForEntity } from '$lib/notes';
import { recordAudit } from '$lib/server/audit';

// Single shared endpoint for note CRUD, used by both the Notes hub and the
// reusable <Notes> widget on other dashboard pages. POST JSON { op, … }.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401);
	const data = await request.json();
	const op = String(data.op ?? '');

	if (op === 'create') {
		const body = String(data.body ?? '').trim();
		if (!body) throw error(400, 'empty note');

		const entityType = isEntityType(data.entityType) ? data.entityType : null;
		const entityId = entityType && data.entityId != null ? Number(data.entityId) : null;

		// A linked note files under its entity's category; otherwise use the
		// requested category, defaulting to General.
		const category =
			categoryForEntity(entityType) ??
			(isNoteCategory(data.category) ? data.category : 'General');

		const now = new Date();
		const [row] = await db
			.insert(notes)
			.values({ body, category, entityType, entityId, createdAt: now, updatedAt: now, authorId: locals.user.id, lastEditedById: locals.user.id })
			.returning({ id: notes.id });
		await recordAudit(locals, { action: 'create', entity: 'note', entityId: row.id, summary: body.slice(0, 60) });
		return json({ ok: true, id: row.id });
	}

	if (op === 'update') {
		const id = Number(data.id);
		const body = String(data.body ?? '').trim();
		if (!id) throw error(400, 'bad id');
		if (!body) throw error(400, 'empty note');
		await db.update(notes).set({ body, updatedAt: new Date(), lastEditedById: locals.user.id }).where(eq(notes.id, id));
		await recordAudit(locals, { action: 'update', entity: 'note', entityId: id, summary: 'Edited a note' });
		return json({ ok: true });
	}

	if (op === 'category') {
		const id = Number(data.id);
		const category = String(data.category ?? '');
		if (!id || !isNoteCategory(category)) throw error(400, 'bad category');
		await db.update(notes).set({ category, updatedAt: new Date() }).where(eq(notes.id, id));
		return json({ ok: true });
	}

	if (op === 'pin') {
		const id = Number(data.id);
		if (!id) throw error(400, 'bad id');
		await db.update(notes).set({ pinned: !!data.pinned }).where(eq(notes.id, id));
		await recordAudit(locals, { action: 'update', entity: 'note', entityId: id, summary: data.pinned ? 'Pinned a note' : 'Unpinned a note' });
		return json({ ok: true });
	}

	if (op === 'delete') {
		const id = Number(data.id);
		if (!id) throw error(400, 'bad id');
		// Remove child comments first — note_comments.note_id references notes(id)
		// and libSQL enforces the FK, so the parent can't be deleted while they exist.
		await db.delete(noteComments).where(eq(noteComments.noteId, id));
		await db.delete(notes).where(eq(notes.id, id));
		await recordAudit(locals, { action: 'delete', entity: 'note', entityId: id, summary: 'Deleted a note' });
		return json({ ok: true });
	}

	if (op === 'comment.create') {
		const noteId = Number(data.noteId);
		const body = String(data.body ?? '').trim();
		if (!noteId || !body) throw error(400, 'bad comment');
		const now = new Date();
		const [row] = await db
			.insert(noteComments)
			.values({ noteId, authorId: locals.user.id, body, createdAt: now, updatedAt: now })
			.returning({ id: noteComments.id });
		await recordAudit(locals, { action: 'create', entity: 'comment', entityId: noteId, summary: body.slice(0, 60) });
		return json({ ok: true, id: row.id });
	}

	if (op === 'comment.update') {
		const id = Number(data.id);
		const body = String(data.body ?? '').trim();
		if (!id || !body) throw error(400, 'bad comment');
		await db.update(noteComments).set({ body, updatedAt: new Date() }).where(eq(noteComments.id, id));
		await recordAudit(locals, { action: 'update', entity: 'comment', entityId: id, summary: 'Edited a comment' });
		return json({ ok: true });
	}

	if (op === 'comment.delete') {
		const id = Number(data.id);
		if (!id) throw error(400, 'bad id');
		await db.delete(noteComments).where(eq(noteComments.id, id));
		await recordAudit(locals, { action: 'delete', entity: 'comment', entityId: id, summary: 'Deleted a comment' });
		return json({ ok: true });
	}

	throw error(400, `unknown op "${op}"`);
};
