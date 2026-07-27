/**
 * Beta Code to Unicode Greek.
 *
 * Beta Code is the ASCII transliteration used by the Perseus and Robinson data sets, including the
 * morphology files in `data/books/*.TSP`, where words look like `*)IHSOU=S` and `A)GA/PH`.
 *
 * Rather than mapping every precomposed polytonic character, base letters are combined with the
 * Unicode combining marks for breathings and accents and the result is normalised to NFC. That
 * produces the same precomposed characters the rest of the data uses, with a fraction of the table.
 *
 * Diacritics follow the letter for lower case (`A)GA/PH`) but precede it for upper case, where the
 * asterisk marks capitalisation (`*)IHSOU=S` is Ἰησοῦς).
 */

const LETTERS: Record<string, string> = {
	A: 'α',
	B: 'β',
	G: 'γ',
	D: 'δ',
	E: 'ε',
	Z: 'ζ',
	H: 'η',
	Q: 'θ',
	I: 'ι',
	K: 'κ',
	L: 'λ',
	M: 'μ',
	N: 'ν',
	C: 'ξ',
	O: 'ο',
	P: 'π',
	R: 'ρ',
	S: 'σ',
	T: 'τ',
	U: 'υ',
	F: 'φ',
	X: 'χ',
	Y: 'ψ',
	W: 'ω',
	V: 'ϝ'
};

/** Combining marks, in the order they must be appended for NFC to compose them. */
const DIAERESIS = '̈';
const SMOOTH_BREATHING = '̓';
const ROUGH_BREATHING = '̔';
const ACUTE = '́';
const GRAVE = '̀';
const CIRCUMFLEX = '͂';
const IOTA_SUBSCRIPT = 'ͅ';

const DIACRITICS: Record<string, string> = {
	')': SMOOTH_BREATHING,
	'(': ROUGH_BREATHING,
	'/': ACUTE,
	'\\': GRAVE,
	'=': CIRCUMFLEX,
	'+': DIAERESIS,
	'|': IOTA_SUBSCRIPT
};

const FINAL_SIGMA = 'ς';

/**
 * Converts a Beta Code word to Unicode Greek.
 *
 * Unknown characters are passed through unchanged, so a stray digit or punctuation mark in a source
 * file never turns into a decoding failure.
 */
export function betaCodeToGreek(input: string): string {
	let out = '';
	let index = 0;

	while (index < input.length) {
		const character = input[index]!;

		// Upper case: an asterisk, then any diacritics, then the letter.
		if (character === '*') {
			index += 1;
			let marks = '';
			while (index < input.length && DIACRITICS[input[index]!]) {
				marks += DIACRITICS[input[index]!];
				index += 1;
			}
			const letter = LETTERS[input[index]?.toUpperCase() ?? ''];
			if (letter) {
				out += order(letter.toUpperCase(), marks);
				index += 1;
			} else {
				out += marks;
			}
			continue;
		}

		const letter = LETTERS[character.toUpperCase()];
		if (!letter) {
			// Sigma variants: S1 is medial, S2 and J are final.
			out += character;
			index += 1;
			continue;
		}

		index += 1;

		// Explicit sigma variants override the positional rule.
		let resolved = letter;
		if (letter === 'σ') {
			const next = input[index];
			if (next === '2') {
				resolved = FINAL_SIGMA;
				index += 1;
			} else if (next === '1') {
				index += 1;
			} else if (!isLetterAhead(input, index)) {
				resolved = FINAL_SIGMA;
			}
		}

		let marks = '';
		while (index < input.length && DIACRITICS[input[index]!]) {
			marks += DIACRITICS[input[index]!];
			index += 1;
		}

		out += order(resolved, marks);
	}

	return out.normalize('NFC');
}

/**
 * Appends combining marks in canonical order: diaeresis or breathing first, then the accent, then the
 * iota subscript. Written in any other order, NFC would not compose them into the precomposed
 * polytonic characters.
 */
function order(letter: string, marks: string): string {
	const has = (mark: string) => marks.includes(mark);

	let out = letter;
	if (has(DIAERESIS)) out += DIAERESIS;
	if (has(SMOOTH_BREATHING)) out += SMOOTH_BREATHING;
	if (has(ROUGH_BREATHING)) out += ROUGH_BREATHING;
	if (has(ACUTE)) out += ACUTE;
	if (has(GRAVE)) out += GRAVE;
	if (has(CIRCUMFLEX)) out += CIRCUMFLEX;
	if (has(IOTA_SUBSCRIPT)) out += IOTA_SUBSCRIPT;
	return out;
}

/** Whether another Greek letter follows, which decides medial versus final sigma. */
function isLetterAhead(input: string, from: number): boolean {
	for (let index = from; index < input.length; index += 1) {
		const character = input[index]!;
		if (DIACRITICS[character] || character === '1' || character === '2') continue;
		return LETTERS[character.toUpperCase()] !== undefined;
	}
	return false;
}

/**
 * Strips accents and breathings, for comparing words that differ only in accentuation. The Textus
 * Receptus is unaccented while the morphology files are accented, so alignment needs this.
 */
export function stripGreekDiacritics(value: string): string {
	return value.normalize('NFD').replace(/[̀-ͯ͂ͅ]/g, '').normalize('NFC').toLowerCase();
}
