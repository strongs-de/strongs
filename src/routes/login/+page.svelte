<script lang="ts">
	import { t } from '$lib/i18n';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import TextField from '$lib/components/TextField.svelte';

	let { data, form } = $props();

	const message = $derived(
		form?.error === 'throttled'
			? t('auth.login.throttled')
			: form?.error
				? t('auth.login.failed')
				: null
	);
</script>

<svelte:head><title>{t('auth.login.title')} — strongs.de</title></svelte:head>

<AuthForm title={t('auth.login.title')} error={message} submitLabel={t('auth.login.submit')}>
	<input type="hidden" name="redirectTo" value={data.redirectTo} />
	<TextField
		name="email"
		type="email"
		label={t('auth.email')}
		value={form?.email ?? ''}
		autocomplete="email"
		required
	/>
	<TextField
		name="password"
		type="password"
		label={t('auth.password')}
		autocomplete="current-password"
		required
	/>

	{#snippet footer()}
		<p>
			<a class="text-accent-600 hover:underline dark:text-accent-400" href="/register"
				>{t('auth.register.title')}</a
			>
		</p>
		<p class="mt-1">
			<a class="text-accent-600 hover:underline dark:text-accent-400" href="/password-reset">
				{t('auth.passwordReset.title')}
			</a>
		</p>
	{/snippet}
</AuthForm>
