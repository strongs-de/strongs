import { describe, expect, it } from 'vitest';
import { parseMorphology } from './morphology.ts';
import { de } from '../i18n/de.ts';

/** Flattens a parse result into readable pairs so expectations stay legible. */
function decode(code: string): { pos: string; features: string[]; unknown: string[] } {
	const parsed = parseMorphology(code);
	if (!parsed) throw new Error(`failed to parse ${code}`);
	return {
		pos: parsed.partOfSpeech,
		features: parsed.features.map((feature) => `${feature.feature}=${feature.value}`),
		unknown: parsed.unknown
	};
}

describe('parseMorphology', () => {
	it('decodes a noun with case, number and gender', () => {
		// Matthew 1:1, βιβλος
		expect(decode('n-nsf')).toEqual({
			pos: 'morph.pos.noun',
			features: [
				'morph.feature.case=morph.case.nominative',
				'morph.feature.number=morph.number.singular',
				'morph.feature.gender=morph.gender.feminine'
			],
			unknown: []
		});
	});

	it('decodes a finite verb', () => {
		// Matthew 1:2, εγεννησεν — aorist active indicative, third person singular
		expect(decode('v-aai-3s')).toEqual({
			pos: 'morph.pos.verb',
			features: [
				'morph.feature.tense=morph.tense.aorist',
				'morph.feature.voice=morph.voice.active',
				'morph.feature.mood=morph.mood.indicative',
				'morph.feature.person=morph.person.third',
				'morph.feature.number=morph.number.singular'
			],
			unknown: []
		});
	});

	it('decodes a participle with case, number and gender instead of a person', () => {
		expect(decode('v-pap-nsm')).toEqual({
			pos: 'morph.pos.verb',
			features: [
				'morph.feature.tense=morph.tense.present',
				'morph.feature.voice=morph.voice.active',
				'morph.feature.mood=morph.mood.participle',
				'morph.feature.case=morph.case.nominative',
				'morph.feature.number=morph.number.singular',
				'morph.feature.gender=morph.gender.masculine'
			],
			unknown: []
		});
	});

	it('decodes second-form tenses', () => {
		const parsed = decode('v-2aai-3s');
		expect(parsed.features).toContain('morph.feature.tense=morph.tense.aorist');
		expect(parsed.features).toContain('morph.feature.form=morph.form.secondForm');
		expect(parsed.unknown).toEqual([]);
	});

	it('decodes an infinitive, which has no person', () => {
		expect(decode('v-aan').features).toEqual([
			'morph.feature.tense=morph.tense.aorist',
			'morph.feature.voice=morph.voice.active',
			'morph.feature.mood=morph.mood.infinitive'
		]);
	});

	it('decodes deponent voices', () => {
		// The voice is the middle letter: v-aDi-3s is a middle deponent, v-aOi-3s a passive one.
		expect(decode('v-adi-3s').features).toContain('morph.feature.voice=morph.voice.middleDeponent');
		expect(decode('v-aoi-3s').features).toContain(
			'morph.feature.voice=morph.voice.passiveDeponent'
		);
		expect(decode('v-pnp-nsm').features).toContain(
			'morph.feature.voice=morph.voice.middleOrPassiveDeponent'
		);
	});

	it('reads the third letter as the mood, not the voice', () => {
		// v-ado-3s is aorist / middle deponent / optative — the trailing O is a mood.
		expect(decode('v-ado-3s').features).toEqual([
			'morph.feature.tense=morph.tense.aorist',
			'morph.feature.voice=morph.voice.middleDeponent',
			'morph.feature.mood=morph.mood.optative',
			'morph.feature.person=morph.person.third',
			'morph.feature.number=morph.number.singular'
		]);
	});

	it('decodes standalone tags', () => {
		expect(decode('conj').pos).toBe('morph.pos.conjunction');
		expect(decode('adv').pos).toBe('morph.pos.adverb');
		expect(decode('prep').pos).toBe('morph.pos.preposition');
		expect(decode('cond').pos).toBe('morph.pos.conditional');
	});

	it('decodes indeclinable suffixes', () => {
		// Matthew 1:1, δαβιδ — an indeclinable proper name
		expect(decode('n-pri')).toEqual({
			pos: 'morph.pos.noun',
			features: ['morph.feature.suffix=morph.suffix.properName'],
			unknown: []
		});
	});

	it('decodes comparatives and Attic forms', () => {
		expect(decode('a-nsm-c').features).toContain('morph.feature.suffix=morph.suffix.comparative');
		expect(decode('n-gsf-att').features).toContain('morph.feature.suffix=morph.suffix.atticGreek');
	});

	it('decodes pronouns', () => {
		expect(decode('p-gsm').pos).toBe('morph.pos.personalPronoun');
		expect(decode('t-asm').pos).toBe('morph.pos.article');
		expect(decode('r-nsm').pos).toBe('morph.pos.relativePronoun');
	});

	it('is case-insensitive and records the original code', () => {
		expect(parseMorphology('V-AAI-3S')?.code).toBe('V-AAI-3S');
		expect(parseMorphology('v-aai-3s')?.features).toEqual(parseMorphology('V-AAI-3S')?.features);
	});

	it('returns null only for empty input', () => {
		expect(parseMorphology('')).toBeNull();
		expect(parseMorphology('   ')).toBeNull();
	});

	it('degrades gracefully instead of hiding an unknown code', () => {
		const parsed = parseMorphology('n-qqq-zz');
		expect(parsed?.partOfSpeech).toBe('morph.pos.noun');
		expect(parsed?.unknown).toEqual(['QQQ', 'ZZ']);
	});

	it('never produces a key that is missing from the German catalogue', () => {
		const codes = [
			'n-nsf',
			'n-pri',
			'a-nsm',
			'a-nsm-c',
			'a-nsm-s',
			't-asm',
			'v-aai-3s',
			'v-2aai-3s',
			'v-pap-nsm',
			'v-aan',
			'v-rpi-3s',
			'v-lai-3s',
			'v-fmi-2p',
			'v-apm-2s',
			'v-pxi-3s',
			'v-aqi-3s',
			'v-pei-3s',
			'v-2rap-nsm',
			'p-1gs',
			'r-nsm',
			'c-apm',
			'd-nsm',
			'k-nsm',
			'i-nsm',
			'x-nsm',
			'q-nsm',
			'f-3gsm',
			's-2spm',
			'adv',
			'conj',
			'cond',
			'prt',
			'prep',
			'inj',
			'aram',
			'heb',
			'n-nui',
			'n-li',
			'n-oi'
		];

		const missing: string[] = [];
		for (const code of codes) {
			const parsed = parseMorphology(code);
			if (!parsed) {
				missing.push(`${code}: not parsed`);
				continue;
			}
			for (const key of [
				parsed.partOfSpeech,
				...parsed.features.flatMap((feature) => [feature.feature, feature.value])
			]) {
				if (!(key in de)) missing.push(`${code}: ${key}`);
			}
		}

		expect(missing).toEqual([]);
	});
});
