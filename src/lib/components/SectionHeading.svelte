<script lang="ts">let { children } = $props();</script>
<h2 class="sh script">{@render children()}</h2>
<style>
  .sh { font-family: var(--serif); font-weight: 600; font-size: 48px; color: var(--ink);
    margin: 4px 0 8px; line-height: 1; letter-spacing: .005em; }
</style>
