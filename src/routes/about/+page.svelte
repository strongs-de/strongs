<svelte:head>
	<title>Über — Akribos</title>
	<meta
		name="description"
		content="Akribos: mehrere Bibelübersetzungen und Kommentare parallel lesen, Strong-Nummern im Urtext nachschlagen, eigene Verslisten und Kommentare führen — mit offener API für Entwickler."
	/>
</svelte:head>

<main class="prose-like mx-auto w-full max-w-2xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold">Über Akribos</h1>

	<section class="mb-8">
		<p class="text-stone-700 dark:text-stone-300">
			Akribos ist ein Online-Bibelleser, der mehrere Übersetzungen und Kommentare nebeneinander
			zeigt und jedes Wort im griechischen oder hebräischen Urtext bis zu seiner Strong-Nummer
			zurückverfolgbar macht. Keine Installation, keine Werbung — einfach eine Bibelstelle eingeben
			und lesen.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Mehrere Übersetzungen und Kommentare parallel lesen</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Du wählst, welche Übersetzungen, Kommentare und Verweisstellen als Spalten nebeneinander
			stehen — bis zu einer wählbaren Höchstzahl, je nach Bildschirmbreite. Im
			<em>ausgerichteten</em> Modus stehen die Verse zeilengenau nebeneinander, auch wenn eine
			Übersetzung zwei Verse zusammenfasst oder einen Vers auslässt. Wer lieber am Stück liest,
			wechselt in den <em>Fließtext</em>-Modus, bei dem jede Spalte unabhängig scrollt. Beide
			Ansichten merken sich deine Auswahl für den nächsten Besuch.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Strong-Nummern und Lexikon</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Wörter, die mit einer Strong-Nummer verknüpft sind, sind im Text markiert. Ein Klick zeigt das
			griechische oder hebräische Wort, seine Umschrift und Aussprache, die Grammatik an dieser
			Stelle, die Grundform und jede weitere Stelle, an der dasselbe Wort vorkommt. Jede
			Strong-Nummer hat außerdem eine eigene Lexikonseite (z. B. <code>G26</code> oder
			<code>H430</code>) mit vollständigem Wörterbucheintrag, allen Vorkommen im Bibeltext und einer
			Übersicht, welche deutschen Wörter die Übersetzung dafür verwendet.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Eigene Verslisten und Kommentare</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Mit einem kostenlosen Konto lassen sich Verse in eigenen Listen sammeln und mit Kommentaren
			versehen — praktisch für Bibelstudium, Predigtvorbereitung oder einfach, um Lieblingsstellen
			wiederzufinden. Eine Liste kann über einen Link geteilt werden, ohne dass die Empfänger selbst
			ein Konto benötigen.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="mb-2 text-lg font-semibold">Offene API für Entwickler</h2>
		<p class="text-stone-700 dark:text-stone-300">
			Wer selbst Software bauen möchte, kann über eine öffentliche API auf Bibeltexte, das
			Strong-Lexikon, Kommentare und die Suche zugreifen — mit einem eigenen API-Schlüssel auch auf
			die eigenen Verslisten und Kommentare. Details dazu stehen auf der
			<a class="text-accent-600 hover:underline dark:text-accent-400" href="/api">API-Seite</a>.
		</p>
	</section>

	<section>
		<p class="text-stone-700 dark:text-stone-300">
			Am besten selbst ausprobieren:
			<a class="text-accent-600 hover:underline dark:text-accent-400" href="/">direkt lesen</a>
			oder
			<a class="text-accent-600 hover:underline dark:text-accent-400" href="/register"
				>ein kostenloses Konto anlegen</a
			>.
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
