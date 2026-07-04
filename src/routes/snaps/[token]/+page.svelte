<script lang="ts">
	import { upload } from '@vercel/blob/client';
	import { dev } from '$app/environment';
	import confetti from 'canvas-confetti';

	let { data } = $props();

	const PREFIX = dev ? 'dev/gallery' : 'gallery';
	const MAX_BYTES = 100 * 1024 * 1024;
	const CHEERS = [
		'You’re basically the official photographer now — take another!',
		'Gorgeous! The gallery just got better.',
		'That one’s going in a frame. More!',
		'Katie & Alex will love this. Keep them coming!',
		'Snapped and saved forever. One more?'
	];

	let files = $state<FileList | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let name = $state('');
	let caption = $state('');
	let busy = $state(false);
	let progress = $state({ done: 0, total: 0 });
	let cheer = $state('');
	let uploadError = $state('');

	async function send() {
		if (!files?.length || busy) return;
		busy = true;
		uploadError = '';
		cheer = '';
		const list = Array.from(files).filter((f) => f.size <= MAX_BYTES);
		const skipped = (files?.length ?? 0) - list.length;
		progress = { done: 0, total: list.length };
		try {
			for (const file of list) {
				const blob = await upload(`${PREFIX}/${file.name}`, file, {
					access: 'public',
					handleUploadUrl: '/api/gallery/upload',
					clientPayload: JSON.stringify({ token: data.token, name, caption })
				});
				// Belt-and-braces registration (sole path in dev — see register endpoint).
				await fetch('/api/gallery/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ token: data.token, url: blob.url, name, caption })
				});
				progress = { ...progress, done: progress.done + 1 };
			}
			cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
			if (skipped > 0) cheer += ` (${skipped} file${skipped > 1 ? 's' : ''} over 100MB skipped.)`;
			caption = '';
			files = null;
			if (fileInput) fileInput.value = '';
			confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } });
		} catch {
			uploadError = 'Hmm, that didn’t send — the barn Wi-Fi can be shy. Give it another go!';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Share your snaps — Katie &amp; Alex</title></svelte:head>

<main class="wrap">
	<p class="eyebrow">2 April 2027 · The Tithe Barn</p>
	<h1 class="script">You caught us!</h1>
	<p class="lede">
		Every photo and video you take lands straight in Katie &amp; Alex’s wedding album —
		the candid ones are always the best ones.
	</p>

	<label class="snap-btn" class:busy>
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*,video/*"
			capture="environment"
			multiple
			disabled={busy}
			onchange={(e) => (files = e.currentTarget.files)}
		/>
		📸 {files?.length ? `${files.length} ready — tap Send below!` : 'Snap or pick your photos'}
	</label>

	{#if files?.length}
		<div class="meta">
			<input type="text" placeholder="Who’s this from? (optional)" maxlength="80" bind:value={name} />
			<input type="text" placeholder="Say something lovely… (optional)" maxlength="280" bind:value={caption} />
			<button class="send" onclick={send} disabled={busy}>
				{#if busy}Sending {progress.done + 1} of {progress.total}…{:else}Send to the album 💌{/if}
			</button>
		</div>
	{/if}

	{#if cheer}<p class="cheer">{cheer}</p>{/if}
	{#if uploadError}<p class="oops">{uploadError}</p>{/if}

	<a class="gallery-link" href="/gallery">👀 Watch the gallery fill up live →</a>
</main>

<style>
	.wrap {
		max-width: 480px;
		margin: 0 auto;
		padding: 48px 24px 64px;
		text-align: center;
	}
	h1 {
		font-size: 56px;
		margin: 12px 0 8px;
	}
	.lede {
		color: var(--body);
		margin-bottom: 32px;
	}
	.snap-btn {
		display: block;
		background: var(--sage);
		color: #fff;
		border-radius: 16px;
		padding: 22px;
		font-size: 18px;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 14px rgba(111, 125, 89, 0.35);
	}
	.snap-btn.busy {
		opacity: 0.6;
	}
	.snap-btn input {
		display: none;
	}
	.meta {
		display: grid;
		gap: 10px;
		margin-top: 16px;
	}
	.meta input {
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font: inherit;
		background: var(--card);
	}
	.send {
		background: var(--terra);
		color: #fff;
		border: 0;
		border-radius: 12px;
		padding: 14px;
		font-size: 17px;
		font-weight: 600;
		cursor: pointer;
	}
	.send:disabled {
		opacity: 0.6;
	}
	.cheer {
		margin-top: 20px;
		color: var(--sage-deep);
		font-weight: 600;
	}
	.oops {
		margin-top: 20px;
		color: var(--terra);
	}
	.gallery-link {
		display: inline-block;
		margin-top: 36px;
		color: var(--sage-deep);
		font-weight: 600;
	}
</style>
