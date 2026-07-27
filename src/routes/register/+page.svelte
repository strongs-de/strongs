<script lang="ts">
	import { t } from '$lib/i18n';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import TextField from '$lib/components/TextField.svelte';

	let { data, form } = $props();

	const message = $derived(
		form?.error === 'taken'
			? t('auth.register.emailTaken')
			: form?.error === 'mismatch'
				? t('auth.register.passwordMismatch')
				: form?.error === 'weak'
					? t('auth.register.passwordTooShort', { min: data.minPasswordLength })
					: form?.error === 'email'
						? t('auth.email')
						: null
	);
</script>

<svelte:head><title>{t('auth.register.title')} — strongs.de</title></svelte:head>

<AuthForm title={t('auth.register.title')} error={message} submitLabel={t('auth.register.submit')}>
	<TextField
		name="email"
		type="email"
		label={t('auth.email')}
		value={form?.email ?? ''}
		autocomplete="email"
		required
	/>
	<TextField
		name="displayName"
		label={t('auth.displayName')}
		value={form?.displayName ?? ''}
		autocomplete="name"
	/>
	<TextField
		name="password"
		type="password"
		label={t('auth.password')}
		autocomplete="new-password"
		minlength={data.minPasswordLength}
		hint={t('auth.register.passwordTooShort', { min: data.minPasswordLength })}
		required
	/>
	<TextField
		name="passwordRepeat"
		type="password"
		label={t('auth.passwordRepeat')}
		autocomplete="new-password"
		required
	/>

	{#snippet footer()}
		<p>
			<a class="text-accent-600 hover:underline dark:text-accent-400" href="/login">
				{t('auth.login.title')}
			</a>
		</p>
	{/snippet}
</AuthForm>
