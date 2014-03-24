# -*- coding: utf-8 -*-

def get_grammar_name(short):
	ret = ''
	short = short.upper()
	add = 0
	if short.startswith('N-'):
		ret = 'Substantiv'
	elif short.startswith('A-'):
		ret = 'Adjektiv'
	elif short.startswith('T-'):
		ret = 'Artikel'
	elif short.startswith('V-'):
		ret = '<b>Wortart:</b> Verb' + ' (' + short + ')' + '<br/><b>Zeitform:</b> '
		if short[2] == 'P': ret = ret + u'Präsens'
		elif short[2] == 'I': ret = ret + 'Imperfekt'
		elif short[2] == 'F': ret = ret + 'Futur 1'
		elif short[2] == 'A': ret = ret + get_aorist()
		elif short[2] == 'R': ret = ret + 'Perfekt'
		elif short[2] == 'L': ret = ret + 'Plusquamperfekt'
		elif short[2] == 'X': ret = ret + ''
		elif short[2] == '2':
			add = 1
			if short[3] == 'F': ret = ret + 'Futur 2'
			elif short[3] == 'A': ret = ret + 'Aorist 2'
			elif short[3] == 'R': ret = ret + 'Perfekt 2'
			elif short[3] == 'L': ret = ret + 'Plusquamperfekt 2'

		# Voice
		ret += '<br/><b>Handlungsrichtung:</b> '
		if short[3+add] == 'A': ret += 'Aktiv'
		elif short[3+add] == 'M': ret += 'Medium'
		elif short[3+add] == 'P': ret += 'Passiv'
		elif short[3+add] == 'E': ret += 'Medium oder Passiv'
		elif short[3+add] == 'D': ret += 'Deponens Medium'
		elif short[3+add] == 'O': ret += 'Deponens Passiv'
		elif short[3+add] == 'N': ret += 'Deponens Medium oder Passiv'
		elif short[3+add] == 'Q': ret += u'Unpersönliches Aktiv'
		elif short[3+add] == 'X': ret += ''

		# Mood
		ret += '<br/><b>Modus:</b> '
		if short[4+add] == 'I': ret += 'Indikativ'
		elif short[4+add] == 'S': ret += 'Sub-/Konjunktiv'
		elif short[4+add] == 'O': ret += 'Optativ'
		elif short[4+add] == 'M': ret += 'Imperativ'
		elif short[4+add] == 'N': ret += 'Infinitiv'
		elif short[4+add] == 'P': ret += 'Partizip'
		elif short[4+add] == 'R': ret += 'Imperativer Partizip'

		# Person
		ret += '<br/><b>Geschlecht/Person:</b> '
		if short[4+add] != 'N':
			if short[4+add] in ['I', 'S', 'O', 'M']:
				ret += short[6+add] + '. Person'
			elif short[4+add] in ['P', 'R']:
				if short[6+add] == 'M':
					ret += u'Geschlecht: Männlich'
				elif short[6+add] == 'F':
					ret += 'Geschlecht: Weiblich'
				elif short[6+add] == 'N':
					ret += 'Geschlecht: Neutral'

	return ret


def get_aorist():
	return '<abbr title="Von Wikipedia ..." rel="tooltip">Aorist</abbr>'

