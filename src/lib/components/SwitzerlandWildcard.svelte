<script lang="ts">
 let dialog: HTMLDialogElement;
 function open() { dialog.showModal(); }
 function close() { dialog.close(); }
</script>

<div class="wildcard-wrap">
 <button class="wildcard-trigger" onclick={open} aria-haspopup="dialog">
  <span class="new">NEW WILDCARD</span>
  <span class="invitation"><strong>What if we went to Switzerland?</strong><span>Budget or Bougy. The flights are on us.</span></span>
  <span class="arrow" aria-hidden="true">↗</span>
 </button>
</div>
<dialog bind:this={dialog} aria-labelledby="wildcard-title" class="wildcard-dialog">
 <div class="modal-photo"><img src="/images/switzerland/grindelwald.jpg" alt="Snow-covered chalets beneath the mountains in Grindelwald" width="1600" height="1067" /><button class="close" onclick={close} aria-label="Close wildcard explanation">×</button><span>THE ORIGINAL PLAN, REVISITED</span></div>
 <div class="modal-copy">
  <p class="kicker">THE WILDCARD / 19–22 MARCH 2027</p>
  <h2 id="wildcard-title">Budget or <em>Bougy?</em></h2>
  <p>Houses in England are expensive. Especially when six couples all need an en-suite. So… what if the adventure we originally wanted could make more sense?</p>
  <div class="gift"><strong>WE ARE PAYING FOR THE FLIGHTS.</strong><span>£180 per couple. Our treat. Nothing to pay back.</span></div>
  <p>Same idea as our offer to cover Skyfall’s extra minimum night. Pick a budget hotel or join us at MGallery. Come home Sunday, or stay until Monday with us.</p><p><strong>Both hotels offer booking with no payment upfront.</strong> Choose a no-prepayment rate and pay at the hotel. Food and extras are just allowances—spend less and it’s cheaper still.</p>
  <p><strong>The big Alps day: £90 each.</strong> We’ll book and pay upfront; pay us back whenever. 3022, if convenient.</p>
  <p class="small">Compare the full costs, including food. Group hotel availability and Saturday tour still need confirming; this is a proposal, not a booking.</p>
  <a class="explore" href="/stendo/archive/switzerland">Explore the Switzerland wildcard <span aria-hidden="true">↗</span></a>
  <button class="back" onclick={close}>Keep looking at houses</button>
 </div>
</dialog>

<style>
 .wildcard-wrap{padding:0 20px;max-width:1220px;margin:0 auto 22px;font-family:var(--sans)}
 .wildcard-trigger{position:relative;isolation:isolate;display:flex;align-items:center;gap:20px;width:100%;padding:19px 24px;border:2px solid #e3c760;background:#e3c760;color:#172e29;text-align:left;cursor:pointer;box-shadow:0 0 22px #e3c76055;transition:transform 160ms cubic-bezier(0.16, 1, 0.3, 1)}
 .wildcard-trigger::before{content:'';position:absolute;inset:-6px;border:2px solid #e3c760;border-radius:2px;z-index:-1;animation:wildcard-glow 2.2s ease-in-out 2}
 .new{font-size:10px;letter-spacing:.12em;font-weight:900;padding:8px;border:1px solid currentColor;white-space:nowrap}.invitation{display:grid;gap:4px}.invitation strong{font-size:20px;line-height:1.2}.invitation span{font-size:13px}.arrow{margin-left:auto;font-size:32px}
 .wildcard-dialog{padding:0;border:0;width:min(570px,calc(100% - 24px));max-height:calc(100dvh - 32px);margin:auto;background:#fbfaf6;color:#283b35;overscroll-behavior:contain;font-family:var(--sans)}
 .wildcard-dialog::backdrop{background:#071a18cc;backdrop-filter:blur(5px)}.modal-photo{height:185px;position:relative;background:#172e29}.modal-photo img{width:100%;height:100%;object-fit:cover}.modal-photo>span{position:absolute;bottom:16px;left:24px;color:white;background:#172e29cc;padding:6px 10px;font-size:10px;letter-spacing:.15em}.close{position:absolute;right:12px;top:12px;width:44px;height:44px;border:0;border-radius:50%;background:#fbfaf6;color:#172e29;font-size:30px;cursor:pointer}.modal-copy{padding:26px}.kicker{font-size:10px;font-weight:700;letter-spacing:.12em}h2{font:48px/1.04 var(--serif);letter-spacing:-.03em;margin:12px 0 20px;color:#172e29}p{font-size:14px;line-height:1.65;margin:14px 0}.gift{display:grid;gap:6px;background:#e9eee5;border-left:3px solid #51603f;padding:15px;font-size:13px}.gift strong{font-size:13px}.small{font-size:12px;color:#59675e}.explore{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px;background:#183c34;color:white;text-decoration:none;font-size:14px;font-weight:700;min-height:52px}.back{display:block;margin:12px auto 0;background:transparent;border:0;text-decoration:underline;min-height:44px;color:#283b35;cursor:pointer}.close,.explore,.back{transition:transform 160ms cubic-bezier(0.16, 1, 0.3, 1)}button:active,.explore:active{transform:scale(.97)}button:focus-visible,a:focus-visible{outline:3px solid #2763c5;outline-offset:4px}
 @keyframes wildcard-glow{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.8;transform:scale(1.008)}}
 @media(max-width:600px){.wildcard-wrap{padding:0 16px;margin-bottom:12px}.wildcard-trigger{flex-wrap:wrap;padding:15px 17px;gap:10px}.new{font-size:9px;padding:4px 6px}.invitation{order:3;width:100%}.invitation strong{font-size:20px}.arrow{font-size:24px}.modal-copy{padding:22px}.modal-photo{height:150px}h2{font-size:43px}}
 @media(prefers-reduced-motion:reduce){.wildcard-trigger::before{animation:none;opacity:.5}button,.explore{transition:none}}
</style>
