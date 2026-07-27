<script lang="ts">
	import { t } from '$lib/i18n';
	import TextField from '$lib/components/TextField.svelte';

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

	const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' });
</script>

<svelte:head><title>{t('nav.account')} — strongs.de</title></svelte:head>

<main class="mx-auto w-full max-w-3xl space-y-10 px-4 py-8">
	<header class="flex items-baseline justify-between gap-4">
		<h1 class="text-xl font-semibold">{t('nav.account')}</h1>
		<form method="POST" action="/logout">
			<button
				type="submit"
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:border-stone-400 dark:border-stone-700"
			>
				{t('auth.logout.submit')}
			</button>
		</form>
	</header>

	<!-- Verse lists -->
	<section>
		<div class="mb-3 flex items-baseline justify-between gap-4">
			<h2 class="text-lg font-semibold">{t('lists.title')}</h2>
		</div>

		{#if data.lists.length > 0}
			<ul class="mb-4 divide-y divide-stone-200 dark:divide-stone-800">
				{#each data.lists as list (list.id)}
					<li class="flex items-center justify-between gap-4 py-2">
						<a class="font-medium hover:underline" href="/lists/{list.id}">{list.title}</a>
						<span class="text-xs text-stone-500 dark:text-stone-400">
							{list.itemCount} Verse · {dateFormat.format(new Date(list.updatedAt))}
							{#if list.isPublic}· {t('lists.share')}{/if}
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		<form method="POST" action="?/createList" class="flex gap-2">
			<input
				name="title"
				placeholder={t('lists.defaultTitle')}
				class="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
			/>
			<button
				type="submit"
				class="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
			>
				{t('lists.new')}
			</button>
		</form>
	</section>

	<!-- Profile -->
	<section>
		<h2 class="mb-3 text-lg font-semibold">{t('auth.displayName')}</h2>
		<form method="POST" action="?/profile" class="max-w-sm space-y-3">
			<TextField
				name="displayName"
				label={t('auth.displayName')}
				value={data.user?.displayName ?? ''}
				autocomplete="name"
			/>
			<button
				type="submit"
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:border-stone-400 dark:border-stone-700"
			>
				{t('action.save')}
			</button>
			{#if form?.saved}<span class="ml-2 text-sm text-stone-500">✓</span>{/if}
		</form>
	</section>

	<!-- Password -->
	<section>
		<h2 class="mb-3 text-lg font-semibold">{t('auth.password')}</h2>
		{#if passwordMessage}
			<p class="mb-3 text-sm text-red-700 dark:text-red-300" role="alert">{passwordMessage}</p>
		{/if}
		{#if form?.passwordSaved}
			<p class="mb-3 text-sm text-stone-600 dark:text-stone-300">{t('action.save')} ✓</p>
		{/if}
		<form method="POST" action="?/password" class="max-w-sm space-y-3">
			<TextField
				name="currentPassword"
				type="password"
				label={t('auth.password')}
				autocomplete="current-password"
				required
			/>
			<TextField
				name="password"
				type="password"
				label={t('auth.passwordRepeat')}
				autocomplete="new-password"
				minlength={data.minPasswordLength}
				required
			/>
			<TextField
				name="passwordRepeat"
				type="password"
				label={t('auth.passwordRepeat')}
				autocomplete="new-password"
				required
			/>
			<button
				type="submit"
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:border-stone-400 dark:border-stone-700"
			>
				{t('action.save')}
			</button>
		</form>
	</section>
</main>
