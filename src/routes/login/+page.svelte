<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>

<main class="login">
	<p class="eyebrow">Alex &amp; Katie</p>
	<h1 class="script">Planning</h1>
	<form method="POST" use:enhance>
		<label for="pc">Passcode</label>
		<input id="pc" name="passcode" type="password" autocomplete="current-password" autofocus />
		{#if form?.error}<p class="err">{form.error}</p>{/if}
		<button type="submit">Enter</button>
	</form>
</main>

<style>
	.login {
		max-width: 360px;
		margin: 14vh auto;
		text-align: center;
		padding: 0 24px;
	}
	form {
		display: grid;
		gap: 10px;
		margin-top: 24px;
		text-align: left;
	}
	label {
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	input {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 11px 14px;
		font: inherit;
	}
	button {
		margin-top: 8px;
		padding: 12px;
		border: 0;
		border-radius: 8px;
		background: var(--sage);
		color: #fff;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-size: 12px;
		cursor: pointer;
	}
	.err {
		color: var(--terra);
		font-size: 13px;
	}
</style>
