/**
 * The canonical 66-book Protestant canon, in the traditional order.
 *
 * Book numbers are 1-based and match the `bnumber` attribute used by Zefania XML and the book
 * numbering of the original site, so imported data and old URLs line up without translation.
 *
 * `chapters` follows the German (Hebrew-based) chapter division used by every translation we ship:
 * Joel has four chapters and Malachi three, where English bibles have three and four. Verified
 * against Elberfelder 1905, Schlachter 1951 and Luther 1912 in `data/bibles/`.
 *
 * These counts validate navigation bounds and are a fallback for display. The authoritative
 * per-resource counts come from the database, because a resource may cover only part of the canon or
 * follow yet another versification.
 */

export type Testament = 'ot' | 'nt';

export type Book = {
	/** 1-based canonical book number, 1 = Genesis, 66 = Revelation. */
	readonly id: number;
	/** OSIS abbreviation, as used by OSIS, USFM and USX sources. */
	readonly osisId: string;
	readonly testament: Testament;
	readonly chapters: number;
};

export const BOOKS: readonly Book[] = [
	{ id: 1, osisId: 'Gen', testament: 'ot', chapters: 50 },
	{ id: 2, osisId: 'Exod', testament: 'ot', chapters: 40 },
	{ id: 3, osisId: 'Lev', testament: 'ot', chapters: 27 },
	{ id: 4, osisId: 'Num', testament: 'ot', chapters: 36 },
	{ id: 5, osisId: 'Deut', testament: 'ot', chapters: 34 },
	{ id: 6, osisId: 'Josh', testament: 'ot', chapters: 24 },
	{ id: 7, osisId: 'Judg', testament: 'ot', chapters: 21 },
	{ id: 8, osisId: 'Ruth', testament: 'ot', chapters: 4 },
	{ id: 9, osisId: '1Sam', testament: 'ot', chapters: 31 },
	{ id: 10, osisId: '2Sam', testament: 'ot', chapters: 24 },
	{ id: 11, osisId: '1Kgs', testament: 'ot', chapters: 22 },
	{ id: 12, osisId: '2Kgs', testament: 'ot', chapters: 25 },
	{ id: 13, osisId: '1Chr', testament: 'ot', chapters: 29 },
	{ id: 14, osisId: '2Chr', testament: 'ot', chapters: 36 },
	{ id: 15, osisId: 'Ezra', testament: 'ot', chapters: 10 },
	{ id: 16, osisId: 'Neh', testament: 'ot', chapters: 13 },
	{ id: 17, osisId: 'Esth', testament: 'ot', chapters: 10 },
	{ id: 18, osisId: 'Job', testament: 'ot', chapters: 42 },
	{ id: 19, osisId: 'Ps', testament: 'ot', chapters: 150 },
	{ id: 20, osisId: 'Prov', testament: 'ot', chapters: 31 },
	{ id: 21, osisId: 'Eccl', testament: 'ot', chapters: 12 },
	{ id: 22, osisId: 'Song', testament: 'ot', chapters: 8 },
	{ id: 23, osisId: 'Isa', testament: 'ot', chapters: 66 },
	{ id: 24, osisId: 'Jer', testament: 'ot', chapters: 52 },
	{ id: 25, osisId: 'Lam', testament: 'ot', chapters: 5 },
	{ id: 26, osisId: 'Ezek', testament: 'ot', chapters: 48 },
	{ id: 27, osisId: 'Dan', testament: 'ot', chapters: 12 },
	{ id: 28, osisId: 'Hos', testament: 'ot', chapters: 14 },
	// Joel and Malachi follow the Hebrew division here, as German bibles do.
	{ id: 29, osisId: 'Joel', testament: 'ot', chapters: 4 },
	{ id: 30, osisId: 'Amos', testament: 'ot', chapters: 9 },
	{ id: 31, osisId: 'Obad', testament: 'ot', chapters: 1 },
	{ id: 32, osisId: 'Jonah', testament: 'ot', chapters: 4 },
	{ id: 33, osisId: 'Mic', testament: 'ot', chapters: 7 },
	{ id: 34, osisId: 'Nah', testament: 'ot', chapters: 3 },
	{ id: 35, osisId: 'Hab', testament: 'ot', chapters: 3 },
	{ id: 36, osisId: 'Zeph', testament: 'ot', chapters: 3 },
	{ id: 37, osisId: 'Hag', testament: 'ot', chapters: 2 },
	{ id: 38, osisId: 'Zech', testament: 'ot', chapters: 14 },
	{ id: 39, osisId: 'Mal', testament: 'ot', chapters: 3 },
	{ id: 40, osisId: 'Matt', testament: 'nt', chapters: 28 },
	{ id: 41, osisId: 'Mark', testament: 'nt', chapters: 16 },
	{ id: 42, osisId: 'Luke', testament: 'nt', chapters: 24 },
	{ id: 43, osisId: 'John', testament: 'nt', chapters: 21 },
	{ id: 44, osisId: 'Acts', testament: 'nt', chapters: 28 },
	{ id: 45, osisId: 'Rom', testament: 'nt', chapters: 16 },
	{ id: 46, osisId: '1Cor', testament: 'nt', chapters: 16 },
	{ id: 47, osisId: '2Cor', testament: 'nt', chapters: 13 },
	{ id: 48, osisId: 'Gal', testament: 'nt', chapters: 6 },
	{ id: 49, osisId: 'Eph', testament: 'nt', chapters: 6 },
	{ id: 50, osisId: 'Phil', testament: 'nt', chapters: 4 },
	{ id: 51, osisId: 'Col', testament: 'nt', chapters: 4 },
	{ id: 52, osisId: '1Thess', testament: 'nt', chapters: 5 },
	{ id: 53, osisId: '2Thess', testament: 'nt', chapters: 3 },
	{ id: 54, osisId: '1Tim', testament: 'nt', chapters: 6 },
	{ id: 55, osisId: '2Tim', testament: 'nt', chapters: 4 },
	{ id: 56, osisId: 'Titus', testament: 'nt', chapters: 3 },
	{ id: 57, osisId: 'Phlm', testament: 'nt', chapters: 1 },
	{ id: 58, osisId: 'Heb', testament: 'nt', chapters: 13 },
	{ id: 59, osisId: 'Jas', testament: 'nt', chapters: 5 },
	{ id: 60, osisId: '1Pet', testament: 'nt', chapters: 5 },
	{ id: 61, osisId: '2Pet', testament: 'nt', chapters: 3 },
	{ id: 62, osisId: '1John', testament: 'nt', chapters: 5 },
	{ id: 63, osisId: '2John', testament: 'nt', chapters: 1 },
	{ id: 64, osisId: '3John', testament: 'nt', chapters: 1 },
	{ id: 65, osisId: 'Jude', testament: 'nt', chapters: 1 },
	{ id: 66, osisId: 'Rev', testament: 'nt', chapters: 22 }
];

/** First book number of the New Testament. Strong's numbers are Hebrew below it, Greek from it up. */
export const FIRST_NT_BOOK = 40;

export const LAST_BOOK = 66;

const byId = new Map(BOOKS.map((book) => [book.id, book]));
const byOsisId = new Map(BOOKS.map((book) => [book.osisId.toLowerCase(), book]));

export function bookById(id: number): Book | undefined {
	return byId.get(id);
}

export function bookByOsisId(osisId: string): Book | undefined {
	return byOsisId.get(osisId.trim().toLowerCase());
}

export function isValidBookId(id: number): boolean {
	return byId.has(id);
}

/** Every book id in a testament, in canonical order — Strong's numbers never cross testaments. */
export function bookIdsForTestament(testament: Testament): number[] {
	return BOOKS.filter((book) => book.testament === testament).map((book) => book.id);
}

/**
 * Which Strong's language a book uses. Determines whether a bare number like `430` means H430 or
 * G430, exactly as the old site decided it from `bookNr < 40`.
 */
export function strongLanguageForBook(bookId: number): 'hebrew' | 'greek' {
	return bookId < FIRST_NT_BOOK ? 'hebrew' : 'greek';
}
