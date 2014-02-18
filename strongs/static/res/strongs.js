$('#searchform').submit(function(e) {
	var path = '/' + $('#strong').val();
	location.href=path;
	e.preventDefault();
});

$('.aorist').popover(
	{trigger: 'hover', title: 'Aus Wikipedia:', content:'Der Aorist ist in einigen indogermanischen Sprachen ein Tempus der Vergangenheit. Im Gegensatz zu anderen Vergangenheitstempora wie beispielsweise dem Imperfekt oder dem Perfekt beschreibt er Vorgänge in der Vergangenheit, die als individuelle einmalig abgeschlossene Handlungen, also punktuell, betrachtet werden. Er beinhaltet damit den perfektiven Verbalaspekt. Diese Aspektbedeutung des Aorist kann in einigen Formen die zeitliche verdrängen.'}
);
// $('.aorist').popover(
	// {trigger: 'hover', title: 'Erklärung:', content:'Der Aorist beschreibt im griechischen entweder den Anfang oder das Ende eines Ereignisses in der Vergangenheit und betont insbesondere dessen punktuellen Charakter. Dabei kann das Ereignis auch noch Einfluss auf die Gegenwart oder Zukunft haben.'}
// );
$('.indikativ').popover(
	{trigger: 'hover', title: 'Aus Wikipedia:', content:'Der Indikativ wird für die Darstellung der Wirklichkeit benutzt. Er ist sozusagen der Normalmodus in allen Texten. Der Indikativ steht für ein tatsächliches Geschehen. Er existiert im Gegensatz zu den beiden anderen Modi in allen menschlichen Sprachen und ist der Modus, der im Deutschen am meisten verwendet wird.'}
);
$('.partizip').popover(
	{trigger: 'hover', title: 'Aus Wikipedia:', content:'Partizip (lat. participium, von particeps „teilhabend“; Plural: Partizipien) ist eine infinite Verbform. Die Bezeichnung deutet auf die Teilhabe (Partizipation) an den Eigenschaften sowohl von Adjektiven als auch von Verben hin. Ähnliches bringt die deutsche Bezeichnung Mittelwort zum Ausdruck, weil das Partizip gleichsam in der Mitte zwischen Verb und Adjektiv steht. Als infinite Verbform ist seine Form unabhängig von grammatikalischen Verbkategorien (Zahl, Person und Modus). Beispiel: "die liebende Mutter"'}
);
$('.imperativ').popover(
	{trigger: 'hover', title: 'Aus Wikipedia:', content:'Der Imperativ (von latenisch imperare: befehlen) ist ein Modus des Verbs. Er wird in erster Linie für Aufforderungen und Befehle oder Ratschläge und Einladungen benutzt.'}
);
$('.infinitiv').popover(
	{trigger: 'hover', title: 'Aus Wikipedia:', content:'Infinitiv (lat. infinitum, „das Unbestimmte“, „das Unvollendete“) ist der Name für eine Verbform, in der Numerus und (normalerweise) Person nicht ausgedrückt werden. Infinitivformen gibt es gleichwohl in verschiedenen Tempora („gesehen haben“) und unterschiedlicher Diathese („gesehen worden sein“). Zusammen mit den Partizipien und dem Inflektiv gehört der Infinitiv zu den infiniten Verbformen. Im Deutschen und in vielen anderen Sprachen wird der Infinitiv als Zitierform eines Verbs verwendet; dies ist jedoch nicht in allen Sprachen so.'}
);