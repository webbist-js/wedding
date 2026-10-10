// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { tick } from 'svelte';
import { createClassComponent } from 'svelte/legacy';
import SuppliersPage from '../src/routes/dashboard/suppliers/+page.svelte';
import type { SupplierRow } from '../src/lib/components/SupplierCard.svelte';

const { invalidateAll } = vi.hoisted(() => ({ invalidateAll: vi.fn() }));
vi.mock('$app/navigation', () => ({ invalidateAll }));

const supplier = (id: number, overrides: Partial<SupplierRow> = {}): SupplierRow & { sort: number } => ({
	id,
	category: 'Photography',
	name: 'Test photographer',
	contact: null,
	phone: null,
	email: null,
	website: null,
	address: null,
	stage: 'Booked',
	quotedAmount: null,
	depositAmount: null,
	depositPaid: false,
	followUpDate: null,
	priority: 2,
	budgetLineId: 1,
	locked: false,
	sort: 0,
	...overrides
});

const initialData = () => ({
	user: null,
	suppliers: [supplier(1)],
	appointments: [],
	payments: [],
	notes: [],
	lineOptions: [{ id: 1, category: 'Photography', section: 'Essentials' }]
});

let page: ReturnType<typeof createClassComponent>;
let target: HTMLDivElement;
let scrollIntoView: Mock<HTMLElement['scrollIntoView']>;
let fetchMock: ReturnType<typeof vi.fn>;

function button(text: string) {
	const found = [...target.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
	if (!found) throw new Error(`Missing button: ${text}`);
	return found;
}

beforeEach(() => {
	vi.resetAllMocks();
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
	scrollIntoView = vi.fn();
	vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);
	target = document.createElement('div');
	document.body.append(target);
	page = createClassComponent({ component: SuppliersPage, target, props: { data: initialData() } });
});

afterEach(async () => {
	page.$destroy();
	await tick();
	target.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('Add supplier', () => {
	it.each(['All', 'Booked 1'])('reveals and focuses the new card when %s is selected', async (filter) => {
		button(filter).click();
		await tick();
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 2 }), { status: 200 }));
		invalidateAll.mockImplementation(async () => {
			page.$set({ data: { ...initialData(), suppliers: [supplier(1), supplier(2, {
				category: 'New', name: null, stage: 'Lead', budgetLineId: null
			})] } });
		});

		button('+ Add supplier').click();

		await vi.waitFor(() => {
			const card = target.querySelector('#supplier-2');
			expect(card).not.toBeNull();
			expect(document.activeElement === card?.querySelector('input.name')).toBe(true);
			expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
		});
		expect(fetchMock).toHaveBeenCalledWith('/dashboard/suppliers/edit', expect.objectContaining({
			method: 'POST', body: JSON.stringify({ op: 'add' })
		}));
	});

	it.each(['server error', 'network error', 'login redirect'])('shows a %s and lets the user retry', async (failure) => {
		if (failure === 'network error') fetchMock.mockRejectedValue(new Error('offline'));
		else if (failure === 'login redirect') fetchMock.mockResolvedValue({ ok: true, redirected: true });
		else fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
		button('+ Add supplier').click();

		await vi.waitFor(() => {
			expect(target.querySelector('[role="alert"]')?.textContent).toContain('Could not add supplier');
			expect(button('+ Add supplier').disabled).toBe(false);
		});
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('reports a refresh failure without suggesting another add request', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 2 }), { status: 200 }));
		invalidateAll.mockRejectedValue(new Error('refresh failed'));
		button('+ Add supplier').click();

		await vi.waitFor(() => {
			expect(target.querySelector('[role="alert"]')?.textContent).toContain('Supplier added');
			expect(target.querySelector('[role="alert"]')?.textContent).toContain('Reload the page');
			expect(button('+ Add supplier').disabled).toBe(false);
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('prevents duplicate requests while adding', async () => {
		fetchMock.mockReturnValue(new Promise(() => {}));
		const add = button('+ Add supplier');
		add.click();
		await tick();
		expect(add.disabled).toBe(true);
		add.click();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
