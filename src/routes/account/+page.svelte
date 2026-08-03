<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import TextField from '$lib/components/TextField.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data, form } = $props();

	const passwordMessage = $derived(
		form?.passwordError === 'current'
			? t('auth.login.failed')
			: form?.passwordError === 'mismatch'
				? t('auth.register.passwordMismatch')
				: form?.passwordError === 'weak'
					? t('auth.register.passwordTooShort', { min: data.minPasswordLength })
					: null
	);

	function listCount(count: number): string {
		if (count === 0) return t('lists.listCountNone');
		if (count === 1) return t('lists.listCountOne');
		return t('lists.listCount', { count });
	}

	let newColor = $state('#fde68a');
</script>

<svelte:head><title>{t('account.title')} — strongs.de</title></svelte:head>

<main class="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
	<header>
		<h1 class="text-2xl font-semibold tracking-tight">{t('account.title')}</h1>
		<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
			{data.user?.displayName ?? data.user?.email}
		</p>
	</header>

	<!-- Verse lists are a reading feature, so they live at /lists; this only points the way. -->
	<Card title={t('lists.title')} description={t('lists.subtitle')}>
		{#snippet actions()}
			<Button href="/lists" variant="secondary">{t('action.open')}</Button>
		{/snippet}
		<p class="text-sm text-stone-500 dark:text-stone-400">{listCount(data.listCount)}</p>
	</Card>

	<Card title={t('account.profile')} description={t('account.profileHint')}>
		<form method="POST" action="?/profile" class="max-w-sm space-y-3">
			<TextField
				name="displayName"
				label={t('auth.displayName')}
				value={data.user?.displayName ?? ''}
				autocomplete="name"
			/>
			<TextField
				name="email"
				label={t('auth.email')}
				value={data.user?.email ?? ''}
				hint={t('account.emailHint')}
				readonly
			/>
			<div class="flex items-center gap-3">
				<Button>{t('action.save')}</Button>
				{#if form?.saved}
					<span class="text-sm text-stone-500 dark:text-stone-400">{t('account.saved')}</span>
				{/if}
			</div>
		</form>
	</Card>

	<Card title={t('account.security')} description={t('account.securityHint')}>
		{#if form?.passwordSaved}
			<p class="mb-3 text-sm text-stone-600 dark:text-stone-300">{t('account.saved')}</p>
		{/if}
		<form method="POST" action="?/password" class="max-w-sm space-y-3">
			<TextField
				name="currentPassword"
				type="password"
				label={t('auth.passwordCurrent')}
				autocomplete="current-password"
				error={form?.passwordError === 'current' ? (passwordMessage ?? undefined) : undefined}
				required
			/>
			<TextField
				name="password"
				type="password"
				label={t('auth.passwordNew')}
				autocomplete="new-password"
				minlength={data.minPasswordLength}
				error={form?.passwordError === 'weak' ? (passwordMessage ?? undefined) : undefined}
				required
			/>
			<TextField
				name="passwordRepeat"
				type="password"
				label={t('auth.passwordRepeat')}
				autocomplete="new-password"
				error={form?.passwordError === 'mismatch' ? (passwordMessage ?? undefined) : undefined}
				required
			/>
			<Button>{t('action.save')}</Button>
		</form>
	</Card>

	<Card title={t('account.appearance')} description={t('account.appearanceHint')}>
		<!-- The toggle is icon-only in the header, where the context is obvious; here it needs saying. -->
		<div class="flex items-center gap-2">
			<ThemeToggle />
			<span class="text-sm text-stone-600 dark:text-stone-300">{t('account.theme')}</span>
		</div>

		<div class="mt-5 border-t border-stone-200 pt-5 dark:border-stone-800">
			<div class="flex items-baseline justify-between gap-3">
				<p class="text-sm font-medium">{t('account.readerFontSize')}</p>
				<span class="text-sm text-stone-500 tabular-nums dark:text-stone-400">
					{data.readerFontScale} %
				</span>
			</div>
			<div class="mt-2 flex items-center gap-2">
				<form method="POST" action="?/reader">
					<input type="hidden" name="fontScale" value={data.readerFontScale - 5} />
					<Button
						type="submit"
						disabled={data.readerFontScale <= 85}
						ariaLabel={t('reader.fontSmaller')}>A−</Button
					>
				</form>
				<form method="POST" action="?/reader">
					<input type="hidden" name="fontScale" value={data.readerFontScale + 5} />
					<Button
						type="submit"
						disabled={data.readerFontScale >= 140}
						ariaLabel={t('reader.fontLarger')}>A+</Button
					>
				</form>
				{#if form?.readerSaved}
					<span class="text-sm text-stone-500 dark:text-stone-400">{t('account.saved')}</span>
				{/if}
			</div>
			<p
				class="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-serif
				       leading-relaxed dark:border-stone-800 dark:bg-stone-950"
				style="font-size: calc(1rem * {data.readerFontScale / 100})"
			>
				{t('account.readerFontPreview')}
			</p>
		</div>

		<div class="mt-5 border-t border-stone-200 pt-5 dark:border-stone-800">
			<p class="text-sm font-medium">{t('account.readerTranslations')}</p>
			<p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
				{t('account.readerTranslationsHint')}
			</p>
			<ul class="mt-2 flex flex-wrap gap-1.5">
				{#each data.columns as columnId (columnId)}
					{@const resource = data.readerResources.find((item) => item.id === columnId)}
					{#if resource}
						<li
							class="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs
							       dark:border-stone-700 dark:bg-stone-800"
						>
							{resource.abbrev}
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	</Card>

	<Card title={t('account.highlights')} description={t('account.highlightsHint')}>
		{#if form?.highlightStyleError === 'color'}
			<p class="mb-3 text-sm text-red-700 dark:text-red-300">{t('highlights.errorColor')}</p>
		{:else if form?.highlightStyleError === 'limit'}
			<p class="mb-3 text-sm text-red-700 dark:text-red-300">
				{t('highlights.errorLimit', { max: data.maxHighlightStyles })}
			</p>
		{/if}

		<ul class="space-y-2">
			{#each data.highlightStyles as style (style.id)}
				<li class="flex items-center gap-2">
					<span
						class="size-6 shrink-0 rounded-full border border-stone-300 dark:border-stone-600"
						style="background-color: {style.color}"
						aria-hidden="true"
					></span>
					<form method="POST" action="?/renameHighlightStyle" class="flex min-w-0 flex-1 gap-2">
						<input type="hidden" name="id" value={style.id} />
						<input
							type="text"
							name="name"
							value={style.name ?? ''}
							placeholder={t('highlights.namePlaceholder')}
							maxlength={60}
							class="w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm
							       shadow-inner shadow-stone-900/3 focus:border-accent-500 focus:ring-3
							       focus:ring-accent-500/10 focus:outline-none dark:border-stone-700
							       dark:bg-stone-900"
						/>
						<Button type="submit" size="sm" variant="secondary">{t('action.save')}</Button>
					</form>
				</li>
			{/each}
		</ul>

		{#if data.highlightStyles.length < data.maxHighlightStyles}
			<form
				method="POST"
				action="?/addHighlightStyle"
				class="mt-4 flex items-center gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"
			>
				<input
					type="color"
					name="color"
					bind:value={newColor}
					aria-label={t('highlights.addColor')}
					class="size-8 shrink-0 rounded border border-stone-300 dark:border-stone-600"
				/>
				<input
					type="text"
					name="name"
					placeholder={t('highlights.namePlaceholder')}
					maxlength={60}
					class="w-full min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5
					       text-sm shadow-inner shadow-stone-900/3 focus:border-accent-500 focus:ring-3
					       focus:ring-accent-500/10 focus:outline-none dark:border-stone-700 dark:bg-stone-900"
				/>
				<Button type="submit" size="sm" variant="secondary">{t('highlights.addColor')}</Button>
			</form>
		{/if}
	</Card>

	<form method="POST" action="/logout" class="flex justify-end">
		<Button variant="secondary">{t('auth.logout.submit')}</Button>
	</form>
</main>
