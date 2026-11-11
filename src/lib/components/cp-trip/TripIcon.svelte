<script lang="ts" module>
	// Every icon on the trip page, by name, so content files can stay plain data.
	import Asterisk from '@lucide/svelte/icons/asterisk';
	import Backpack from '@lucide/svelte/icons/backpack';
	import Bath from '@lucide/svelte/icons/bath';
	import BedDouble from '@lucide/svelte/icons/bed-double';
	import Bike from '@lucide/svelte/icons/bike';
	import Brain from '@lucide/svelte/icons/brain';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import CookingPot from '@lucide/svelte/icons/cooking-pot';
	import Dices from '@lucide/svelte/icons/dices';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import EggFried from '@lucide/svelte/icons/egg-fried';
	import ListMusic from '@lucide/svelte/icons/list-music';
	import House from '@lucide/svelte/icons/house';
	import Medal from '@lucide/svelte/icons/medal';
	import Music from '@lucide/svelte/icons/music';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Slice from '@lucide/svelte/icons/slice';
	import Squirrel from '@lucide/svelte/icons/squirrel';
	import ThermometerSun from '@lucide/svelte/icons/thermometer-sun';
	import TreeDeciduous from '@lucide/svelte/icons/tree-deciduous';
	import Trees from '@lucide/svelte/icons/trees';
	import Utensils from '@lucide/svelte/icons/utensils';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Wallet from '@lucide/svelte/icons/wallet';
	import VolumeX from '@lucide/svelte/icons/volume-x';
	import WavesLadder from '@lucide/svelte/icons/waves-ladder';

	export const ICONS = {
		asterisk: Asterisk,
		backpack: Backpack,
		bath: Bath,
		bed: BedDouble,
		bike: Bike,
		brain: Brain,
		calendar: CalendarCheck,
		'chevron-down': ChevronDown,
		'chevron-right': ChevronRight,
		'chevron-up': ChevronUp,
		'cooking-pot': CookingPot,
		dices: Dices,
		dumbbell: Dumbbell,
		egg: EggFried,
		home: House,
		knife: Slice,
		lyrics: ListMusic,
		medal: Medal,
		music: Music,
		party: PartyPopper,
		pause: Pause,
		play: Play,
		pool: WavesLadder,
		sauna: ThermometerSun,
		squirrel: Squirrel,
		tree: TreeDeciduous,
		trees: Trees,
		utensils: Utensils,
		volume: Volume2,
		wallet: Wallet,
		mute: VolumeX
	};
	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let { name, size = 24, strokeWidth = 2, class: cls = '' }: { name: IconName; size?: number; strokeWidth?: number; class?: string } = $props();
	const Icon = $derived(ICONS[name]);
</script>

<Icon {size} {strokeWidth} class={cls} aria-hidden="true" />
