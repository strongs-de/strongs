/**
 * Decoder for Robinson's Morphological Analysis Codes (RMAC), the parsing codes carried by the
 * Textus Receptus source in `data/bibles/GRC_GNTTR_TEXTUS_RECEPTUS_NT.xml` (`<gr rmac="v-aai-3s">`).
 *
 * Replaces `legacy/strongs/grammar_parser.py`, which walked the code with hand-written index
 * arithmetic (`short[6 + add]`, which reads past the end of short codes) and returned German HTML
 * with inline tooltips. Here the code is decomposed into feature keys and the UI decides how to
 * render and translate them.
 *
 * Codes are compared case-insensitively; the source file uses lower case, most literature upper.
 */

export type MorphologyFeature = {
	/** i18n key for the feature name, e.g. `morph.feature.tense`. */
	feature: string;
	/** i18n key for the value, e.g. `morph.tense.aorist`. */
	value: string;
};

export type Morphology = {
	/** The code as it appeared in the source, upper-cased. */
	code: string;
	/** i18n key for the part of speech, e.g. `morph.pos.verb`. */
	partOfSpeech: string;
	features: MorphologyFeature[];
	/** Code fragments that could not be interpreted. Rendered verbatim so nothing is silently lost. */
	unknown: string[];
};

const POS = {
	N: 'noun',
	A: 'adjective',
	T: 'article',
	V: 'verb',
	P: 'personalPronoun',
	R: 'relativePronoun',
	C: 'reciprocalPronoun',
	D: 'demonstrativePronoun',
	K: 'correlativePronoun',
	I: 'interrogativePronoun',
	X: 'indefinitePronoun',
	Q: 'correlativeOrInterrogativePronoun',
	F: 'reflexivePronoun',
	S: 'possessivePronoun',
	ADV: 'adverb',
	CONJ: 'conjunction',
	COND: 'conditional',
	PRT: 'particle',
	PREP: 'preposition',
	INJ: 'interjection',
	ARAM: 'aramaic',
	HEB: 'hebrew'
} as const;

const CASE = {
	N: 'nominative',
	V: 'vocative',
	G: 'genitive',
	D: 'dative',
	A: 'accusative'
} as const;
const NUMBER = { S: 'singular', P: 'plural' } as const;
const GENDER = { M: 'masculine', F: 'feminine', N: 'neuter' } as const;

const TENSE = {
	P: 'present',
	I: 'imperfect',
	F: 'future',
	A: 'aorist',
	R: 'perfect',
	L: 'pluperfect',
	X: 'noTense'
} as const;

const VOICE = {
	A: 'active',
	M: 'middle',
	P: 'passive',
	E: 'middleOrPassive',
	D: 'middleDeponent',
	O: 'passiveDeponent',
	N: 'middleOrPassiveDeponent',
	Q: 'impersonalActive',
	X: 'noVoice'
} as const;

const MOOD = {
	I: 'indicative',
	S: 'subjunctive',
	O: 'optative',
	M: 'imperative',
	N: 'infinitive',
	P: 'participle',
	R: 'imperativeParticiple'
} as const;

const PERSON = { '1': 'first', '2': 'second', '3': 'third' } as const;

/**
 * Suffixes RMAC appends to a code. Some qualify the word (comparative, superlative), some mark
 * indeclinable forms, some flag a dialect or textual variant.
 */
const SUFFIX = {
	PRI: 'properName',
	NUI: 'numeral',
	LI: 'letter',
	OI: 'otherIndeclinable',
	C: 'comparative',
	S: 'superlative',
	ABB: 'abbreviated',
	ATT: 'atticGreek',
	N: 'negative',
	K: 'contracted',
	M: 'middleSignificance',
	P: 'particle',
	I: 'interrogative'
} as const;

/** Part-of-speech tags that stand alone: no case, no number, no gender. */
const STANDALONE = new Set(['ADV', 'CONJ', 'COND', 'PRT', 'PREP', 'INJ', 'ARAM', 'HEB']);

function key(kind: string, value: string): MorphologyFeature {
	return { feature: `morph.feature.${kind}`, value: `morph.${kind}.${value}` };
}

/**
 * Parses an RMAC code. Returns null only when the code is empty or its part of speech is
 * unrecognisable; anything else degrades to a partial result with the rest reported in `unknown`,
 * because an unparsable variant code must never hide the word from the reader.
 */
export function parseMorphology(rawCode: string): Morphology | null {
	const code = rawCode.trim().toUpperCase();
	if (!code) return null;

	const segments = code.split('-');
	const head = segments[0] ?? '';
	if (!head) return null;

	const unknown: string[] = [];
	const features: MorphologyFeature[] = [];

	if (STANDALONE.has(head)) {
		for (const segment of segments.slice(1)) addSuffix(segment, features, unknown);
		return { code, partOfSpeech: `morph.pos.${POS[head as keyof typeof POS]}`, features, unknown };
	}

	const posLetter = head as keyof typeof POS;
	const posName = POS[posLetter];
	if (!posName || head.length !== 1) {
		// Multi-letter tags that are not standalone are unknown to us; report the whole code.
		return { code, partOfSpeech: `morph.pos.unknown`, features, unknown: segments };
	}

	if (posLetter === 'V') {
		parseVerb(segments, features, unknown);
	} else {
		parseDeclined(segments, features, unknown);
	}

	return { code, partOfSpeech: `morph.pos.${posName}`, features, unknown };
}

/**
 * Nouns, adjectives, articles and pronouns: `N-NSF` is case, number, gender. Indeclinable forms
 * carry a suffix instead of the triple, as in `N-PRI` (indeclinable proper name).
 */
function parseDeclined(segments: string[], features: MorphologyFeature[], unknown: string[]): void {
	for (const segment of segments.slice(1)) {
		if (segment.length === 3 && CASE[segment[0] as keyof typeof CASE]) {
			const [caseLetter, numberLetter, genderLetter] = segment;
			const parsedCase = CASE[caseLetter as keyof typeof CASE];
			const parsedNumber = NUMBER[numberLetter as keyof typeof NUMBER];
			const parsedGender = GENDER[genderLetter as keyof typeof GENDER];
			if (parsedCase && parsedNumber && parsedGender) {
				features.push(key('case', parsedCase));
				features.push(key('number', parsedNumber));
				features.push(key('gender', parsedGender));
				continue;
			}
		}
		addSuffix(segment, features, unknown);
	}
}

/**
 * Verbs: `V-{tense}{voice}{mood}` optionally followed by `{person}{number}` for finite forms or
 * `{case}{number}{gender}` for participles and imperative participles. Second aorist and friends
 * prefix the tense with `2`.
 */
function parseVerb(segments: string[], features: MorphologyFeature[], unknown: string[]): void {
	const parsing = segments[1];
	if (!parsing) return;

	let rest = parsing;
	let secondForm = false;
	if (rest.startsWith('2')) {
		secondForm = true;
		rest = rest.slice(1);
	}

	const tense = TENSE[rest[0] as keyof typeof TENSE];
	const voice = VOICE[rest[1] as keyof typeof VOICE];
	const mood = MOOD[rest[2] as keyof typeof MOOD];

	if (!tense || !voice || !mood) {
		unknown.push(parsing);
	} else {
		features.push(key('tense', tense));
		if (secondForm) features.push(key('form', 'secondForm'));
		features.push(key('voice', voice));
		features.push(key('mood', mood));
		if (rest.length > 3) unknown.push(rest.slice(3));
	}

	const isParticiple = mood === 'participle' || mood === 'imperativeParticiple';

	for (const segment of segments.slice(2)) {
		if (isParticiple && segment.length === 3 && CASE[segment[0] as keyof typeof CASE]) {
			parseDeclined(['', segment], features, unknown);
			continue;
		}

		// Finite forms: person and number, e.g. `3S`.
		const finite = /^([123])([SP])$/.exec(segment);
		if (finite) {
			features.push(key('person', PERSON[finite[1] as keyof typeof PERSON]));
			features.push(key('number', NUMBER[finite[2] as keyof typeof NUMBER]));
			continue;
		}

		addSuffix(segment, features, unknown);
	}
}

function addSuffix(segment: string, features: MorphologyFeature[], unknown: string[]): void {
	if (!segment) return;
	const suffix = SUFFIX[segment as keyof typeof SUFFIX];
	if (suffix) features.push(key('suffix', suffix));
	else unknown.push(segment);
}
