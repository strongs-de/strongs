import { describe, expect, it } from 'vitest';
import { addColumn, defaultColumns, MAX_COLUMNS, removeColumn, setColumn } from './columns.ts';
import type { ReadableResource } from './repositories/resources.ts';

/** Just enough of a resource for the column arithmetic, which only ever reads the id. */
function resource(id: string): ReadableResource {
	return {
		id,
		kind: 'bible',
		name: id,
		abbrev: id,
		language: 'de',
		canon: 'both',
		direction: 'ltr',
		sortOrder: 100,
		hasStrongs: false,
		hasMorphology: false,
		licenseHtml: null
	};
}

const available = ['A', 'B', 'C', 'D', 'E', 'F'].map(resource);

describe('reader columns', () => {
	it('offers the first four translations to a first-time visitor', () => {
		expect(defaultColumns(available)).toEqual(['A', 'B', 'C', 'D']);
	});

	describe('addColumn', () => {
		it('appends the first translation not on screen', () => {
			expect(addColumn(['A', 'C'], available)).toEqual(['A', 'C', 'B']);
		});

		it('appends the translation the reader picked', () => {
			expect(addColumn(['A', 'C'], available, 'E')).toEqual(['A', 'C', 'E']);
		});

		it('ignores a translation that is already on screen', () => {
			expect(addColumn(['A', 'C'], available, 'C')).toEqual(['A', 'C']);
		});

		it('ignores an unknown translation rather than inventing a column', () => {
			expect(addColumn(['A'], available, 'nonexistent')).toEqual(['A']);
		});

		it('stops at the column limit', () => {
			const full = available.slice(0, MAX_COLUMNS).map((entry) => entry.id);
			expect(addColumn(full, available)).toEqual(full);
			expect(addColumn(full, available, 'F')).toEqual(full);
		});
	});

	describe('setColumn', () => {
		it('swaps when the chosen translation is already in another column', () => {
			expect(setColumn(['A', 'B', 'C'], 0, 'C')).toEqual(['C', 'B', 'A']);
		});

		it('replaces when the chosen translation is not shown yet', () => {
			expect(setColumn(['A', 'B'], 1, 'D')).toEqual(['A', 'D']);
		});
	});

	describe('removeColumn', () => {
		it('drops the column at the given position', () => {
			expect(removeColumn(['A', 'B', 'C'], 1)).toEqual(['A', 'C']);
		});

		it('refuses to leave the reader with nothing to read', () => {
			expect(removeColumn(['A'], 0)).toEqual(['A']);
		});
	});
});
