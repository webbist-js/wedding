import { describe, it, expect } from 'vitest';
import { guestReport, householdSummary, type ReportHousehold } from '../src/lib/guest-report';

const g = (over: Partial<ReportHousehold['members'][number]> = {}) => ({
	name: 'Guest',
	side: 'B' as const,
	relationshipGroup: "Bride's family",
	attendanceType: 'day' as const,
	isChild: false,
	isPlusOne: false,
	rsvpStatus: 'pending' as const,
	...over
});
const h = (over: Partial<ReportHousehold> = {}): ReportHousehold => ({
	id: 1,
	name: 'Household',
	address: null,
	email: null,
	phone: null,
	inviteSentAt: null,
	members: [g()],
	...over
});

describe('householdSummary', () => {
	it('derives side from members (mixed = both)', () => {
		expect(householdSummary(h({ members: [g({ side: 'B' }), g({ side: 'X' })] })).side).toBe('B');
		expect(householdSummary(h({ members: [g({ side: 'G' })] })).side).toBe('G');
		expect(householdSummary(h({ members: [g({ side: 'B' }), g({ side: 'G' })] })).side).toBe('X');
	});
	it('counts who is invited to what', () => {
		const s = householdSummary(h({ members: [g(), g({ attendanceType: 'evening' })] }));
		expect(s.invited).toEqual({ day: 1, eve: 1 });
	});
	it('labels RSVP progress', () => {
		expect(householdSummary(h({ members: [g(), g()] })).rsvp.label).toBe('Awaiting');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'yes' }), g({ rsvpStatus: 'yes' })] })).rsvp.label).toBe('Attending');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'no' })] })).rsvp.label).toBe('Declined');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'yes' }), g()] })).rsvp.label).toBe('1 of 2');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'yes' }), g({ rsvpStatus: 'no' })] })).rsvp.label).toBe('1 attending');
	});
	it('classifies status for filtering', () => {
		expect(householdSummary(h({ members: [g()] })).rsvp.status).toBe('awaiting');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'yes' }), g()] })).rsvp.status).toBe('awaiting');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'yes' })] })).rsvp.status).toBe('replied');
		expect(householdSummary(h({ members: [g({ rsvpStatus: 'no' }), g({ rsvpStatus: 'no' })] })).rsvp.status).toBe('declined');
	});
	it('reports which contact routes exist', () => {
		expect(householdSummary(h({ address: '1 Road', phone: '07' })).contact).toEqual({ post: true, email: false, tel: true });
	});
	it('builds the sub-line from group, names, children and plus-ones', () => {
		const s = householdSummary(
			h({
				members: [
					g({ name: 'Clare Smith', relationshipGroup: "Bride's friends" }),
					g({ name: 'Ben Smith', relationshipGroup: "Bride's friends" }),
					g({ name: 'Isla', isChild: true }),
					g({ name: 'Guest of Clare', isPlusOne: true })
				]
			})
		);
		expect(s.subline).toBe("Bride's friends · Clare, Ben, Isla · 1 child · +1");
	});
	it('sub-line for a single guest is just the group', () => {
		expect(householdSummary(h({ members: [g({ relationshipGroup: 'Football' })] })).subline).toBe('Football');
	});
});

describe('guestReport', () => {
	const hs: ReportHousehold[] = [
		h({ id: 1, address: '1 Road', email: 'a@b', inviteSentAt: '2026-09-14', members: [g({ rsvpStatus: 'yes' }), g({ rsvpStatus: 'yes', isChild: true })] }),
		h({ id: 2, phone: '07', members: [g({ side: 'G', rsvpStatus: 'no' })] }),
		h({ id: 3, members: [g({ side: 'G', attendanceType: 'evening', isPlusOne: true })] })
	];
	const r = guestReport(hs);
	it('rsvp totals', () => {
		expect(r.rsvp).toEqual({ yes: 2, no: 1, pending: 1, total: 4, replied: 3 });
	});
	it('guest stats', () => {
		expect(r.stats).toEqual({ guests: 4, day: 3, evening: 1, households: 3, children: 1, plusOnes: 1, bride: 2, groom: 2 });
	});
	it('attention counts', () => {
		expect(r.attention).toEqual({ noAddress: 2, noContact: 1, inviteNotSent: 2 });
	});
});
