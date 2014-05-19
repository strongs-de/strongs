# -*- coding: utf8 -*-

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
        if short[4+add] == 'I': ret += get_indikativ()
        elif short[4+add] == 'S': ret += 'Sub-/Konjunktiv'
        elif short[4+add] == 'O': ret += 'Optativ'
        elif short[4+add] == 'M': ret += get_imperativ()
        elif short[4+add] == 'N': ret += get_infinitiv()
        elif short[4+add] == 'P': ret += get_partizip()
        elif short[4+add] == 'R': ret += 'Imperativer Partizip'

        # Person
        ret += '<br/><b>Geschlecht/Person:</b> '
        if short[4+add] != 'N':
            if short[4+add] in ['I', 'S', 'O', 'M'] and len(short) >= 6:
                ret += short[6+add] + '. Person'
            elif short[4+add] in ['P', 'R'] and len(short) >= 6:
                if short[6+add] == 'M':
                    ret += u'Männlich'
                elif short[6+add] == 'F':
                    ret += 'Weiblich'
                elif short[6+add] == 'N':
                    ret += 'Neutral'
                elif short[6+add] == 'A':
                    ret += '---'

	return ret


def get_aorist():
	return u'<span class="tooltip" title="<b><u>Aorist (aus Wikipedia):</b></u><br/>\
		Der Aorist ist in einigen indogermanischen Sprachen ein Tempus der Vergangenheit. \
		Im Gegensatz zu anderen Vergangenheitstempora wie beispielsweise dem Imperfekt oder \
		dem Perfekt beschreibt er Vorgänge in der Vergangenheit, die als individuelle einmalig \
		abgeschlossene Handlungen, also punktuell, betrachtet werden. Er beinhaltet damit den \
		perfektiven Verbalaspekt. Diese Aspektbedeutung des Aorist kann in einigen Formen die \
		zeitliche verdrängen.">Aorist</span>'
	# return '<abbr class="tip" data-tip="Ein Aorist ist ...">Aorist</abbr>'

def get_indikativ():
	return u'<span title="<b><u>Indikativ (aus Wikipedia):</b></u><br/>Der Indikativ wird für die Darstellung der Wirklichkeit benutzt. Er ist sozusagen der Normalmodus in allen Texten. Der Indikativ steht für ein tatsächliches Geschehen. Er existiert im Gegensatz zu den beiden anderen Modi in allen menschlichen Sprachen und ist der Modus, der im Deutschen am meisten verwendet wird." class="tooltip">Indikativ</span>'


def get_partizip():
	return u'<span title="<b><u>Partizip (aus Wikipedia):</b></u><br/>Partizip (lat. participium, von particeps „teilhabend“; Plural: Partizipien) ist eine infinite Verbform. Die Bezeichnung deutet auf die Teilhabe (Partizipation) an den Eigenschaften sowohl von Adjektiven als auch von Verben hin. Ähnliches bringt die deutsche Bezeichnung Mittelwort zum Ausdruck, weil das Partizip gleichsam in der Mitte zwischen Verb und Adjektiv steht. Als infinite Verbform ist seine Form unabhängig von grammatikalischen Verbkategorien (Zahl, Person und Modus). Beispiel: die liebende Mutter" class="tooltip">Partizip</span>'


def get_imperativ():
	return u'<span title="<b><u>Imperativ (aus Wikipedia):</b></u><br/>Der Imperativ (von latenisch imperare: befehlen) ist ein Modus des Verbs. Er wird in erster Linie für Aufforderungen und Befehle oder Ratschläge und Einladungen benutzt." class="tooltip">Imperativ</spann>'


def get_infinitiv():
	return u'<span title="<b><u>Infinitiv (aus Wikipedia):</b></u><br/>Infinitiv (lat. infinitum, „das Unbestimmte“, „das Unvollendete“) ist der Name für eine Verbform, in der Numerus und (normalerweise) Person nicht ausgedrückt werden. Infinitivformen gibt es gleichwohl in verschiedenen Tempora („gesehen haben“) und unterschiedlicher Diathese („gesehen worden sein“). Zusammen mit den Partizipien und dem Inflektiv gehört der Infinitiv zu den infiniten Verbformen. Im Deutschen und in vielen anderen Sprachen wird der Infinitiv als Zitierform eines Verbs verwendet; dies ist jedoch nicht in allen Sprachen so." class="tooltip">Infinitiv</span>'


# def get__():
	# return u'<abbr title="<b><u>Von Wikipedia:</b></u><br/></abbrv>'
