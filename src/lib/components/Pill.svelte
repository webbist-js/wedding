<script lang="ts">
  let { tone = 'neut', children } = $props(); // neut|green|rose|tan|terra|lilac
</script>
<span class="pill {tone}">{@render children()}</span>
<style>
  .pill { display: inline-block; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
    font-size: 10px; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
  .neut { background: #f0ede5; color: #8a8678; }
  .green { background: var(--sage-soft); color: var(--sage-deep); }
  .rose { background: var(--rose-bg); color: var(--rose); }
  .tan { background: #f0e8da; color: #9a7b53; }
  .terra { background: var(--terra-bg); color: var(--terra); }
  .lilac { background: var(--lilac-bg); color: var(--lilac); }
</style>
