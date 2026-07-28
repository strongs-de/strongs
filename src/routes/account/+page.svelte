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
	</Card>

	<form method="POST" action="/logout" class="flex justify-end">
		<Button variant="secondary">{t('auth.logout.submit')}</Button>
	</form>
</main>
