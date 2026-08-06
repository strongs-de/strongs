<script lang="ts">
	/**
	 * Help page.
	 *
	 * The old site kept this text inside the study sidebar, where it was only visible until the first
	 * word was clicked and then gone for good.
	 */
</script>

<svelte:head>
	<title>Hilfe — Akribos</title>
	<meta
		name="description"
		content="Wie du auf Akribos Bibelstellen findest, nach Wörtern suchst und mit Strong-Nummern im Urtext arbeitest."
	/>
</svelte:head>

<main class="prose-like mx-auto w-full max-w-2xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold">Hilfe</h1>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Bibelstellen aufrufen</h2>
		<p class="mb-3 text-stone-700 dark:text-stone-300">
			Gib die Stelle einfach ins Suchfeld ein. Es versteht die üblichen Schreibweisen:
		</p>
		<ul class="space-y-1 text-sm">
			<li><code>Joh 3,16</code> — ein einzelner Vers</li>
			<li><code>Joh3</code> — ein ganzes Kapitel</li>
			<li><code>1.Mose 1,1</code> oder <code>1Mo1,1</code> — beides führt zum selben Vers</li>
			<li><code>Joh 3,16-18</code> — ein Versbereich</li>
			<li><code>Ps 23</code>, <code>Hohes Lied 2,1</code>, <code>Römer8,28</code></li>
		</ul>
		<p class="mt-3 text-sm text-stone-600 dark:text-stone-400">
			Mit den Pfeiltasten links und rechts blätterst du durch die Kapitel. Wenn du irgendwo auf der
			Seite zu tippen beginnst, springt der Fokus ins Suchfeld.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Nach Wörtern suchen</h2>
		<ul class="space-y-1 text-sm">
			<li>
				<code>liebe</code> — findet auch <em>Liebe</em>, <em>lieben</em> und <em>liebt</em>. Der
				Wortanfang genügt; das Wort muss nicht vollständig ausgeschrieben sein.
			</li>
			<li><code>gnade wahrheit</code> — findet Verse, in denen beide Wörter vorkommen</li>
			<li>
				<code>"am Anfang"</code> — in Anführungszeichen wird genau diese Wortfolge gesucht
			</li>
			<li><code>liebe -zorn</code> — ein Minus davor schließt ein Wort aus</li>
		</ul>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Mit dem Urtext arbeiten</h2>
		<p class="mb-3 text-stone-700 dark:text-stone-300">
			Wörter, die mit einer Strong-Nummer verknüpft sind, sind zart unterstrichen. Ein Klick öffnet
			die Seitenleiste und zeigt:
		</p>
		<ul class="space-y-1 text-sm">
			<li>das griechische oder hebräische Wort, seine Umschrift und Aussprache</li>
			<li>die Grammatik der Form an dieser Stelle — Zeitform, Modus, Fall, Numerus</li>
			<li>die Grundform (das Lemma), also den Eintrag, unter dem das Wort im Wörterbuch steht</li>
			<li>
				womit die Übersetzung dieses Wort sonst wiedergibt, mit Häufigkeiten — oft die
				aufschlussreichste Angabe
			</li>
			<li>alle weiteren Stellen, an denen dasselbe Wort steht</li>
		</ul>
		<p class="mt-3 text-sm text-stone-600 dark:text-stone-400">
			Eine Strong-Nummer kannst du auch direkt eingeben: <code>G26</code> für griechische,
			<code>H430</code> für hebräische Wörter.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Übersetzungen vergleichen</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Über jeder Spalte wählst du die Übersetzung aus. Die Verse stehen zeilengenau nebeneinander,
			auch dann, wenn eine Übersetzung zwei Verse zusammenfasst oder einen Vers nicht enthält. Deine
			Auswahl wird gespeichert.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Verslisten</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Mit einem Konto kannst du Verse sammeln und mit Notizen versehen — über den Stern neben der
			Versnummer. Eine Liste lässt sich über einen Link freigeben, ohne dass die Empfänger ein Konto
			brauchen.
		</p>
	</section>

	<section>
		<h2 class="mb-2 text-lg font-semibold">Woher die Texte kommen</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Jede Übersetzung und jedes Nachschlagewerk trägt seinen eigenen Rechtehinweis; er steht unter
			der jeweiligen Spalte. Die Software selbst ist quelloffen.
		</p>
	</section>
</main>

<style>
	.prose-like code {
		border-radius: 0.25rem;
		background: var(--color-stone-100);
		padding: 0.1rem 0.3rem;
		font-size: 0.875em;
	}

	:global(.dark) .prose-like code {
		background: var(--color-stone-800);
	}
</style>
