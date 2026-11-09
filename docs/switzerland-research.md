# Switzerland wildcard — research and costing

Checked 7 November 2026. Intended dates: Friday 19 March to Sunday 21 or Monday 22 March 2027. Six couples / 12 adults. Implementation is a local proposal and cost planner; no bookings, messages or ballot resets made.

## Quotes observed in the Accor browser booking engine

One room, two adults, GBP display, requested dates visibly verified. Taxes and fees included. Currency conversion indicative; charges payable in hotel currency. Rates not held and six-room stock not established.

| Hotel | 2 nights | 3 nights | Details |
|---|---:|---:|---|
| ibis budget Genève Aéroport, 5653 | £157.18 | £226.53 | Stay for More room-only offer. Double 150 × 190 cm + unused upper bunk; private shower/toilet. 3-night rate: only 5 rooms left, free cancellation until 18 March 23:59, no prepayment. No claim of six identical rooms at that rate. |
| Hotel Rotary Geneva MGallery, 1322 | £371.38 | £553.65 | Classic Queen, Signature Escapes offer, book before 1 December. Room-only, no prepayment; cancellation until 18 March 18:00. Member rates £353.59 / £527.14, not used for public comparison. |

User initially said Premier Inn, then clarified ibis. The requested ~£150 matches the observed 2-night ibis budget offer approximately, not a 3-night stay. User's £553 matches MGallery 3-night public rate to rounding. Explicitly disclose unused bunk rather than imply room has no bunk.

Sources:
- https://all.accor.com/booking/en/accor/hotel/5653?dateIn=2027-03-19&nights=2&compositions=2&currencyCode=GBP
- https://all.accor.com/booking/en/accor/hotel/5653?dateIn=2027-03-19&nights=3&compositions=2&currencyCode=GBP
- https://all.accor.com/booking/en/accor/hotel/1322?dateIn=2027-03-19&nights=2&compositions=2&currencyCode=GBP
- https://all.accor.com/booking/en/accor/hotel/1322?dateIn=2027-03-19&nights=3&compositions=2&currencyCode=GBP
- https://all.accor.com/hotel/5653/index.en.shtml — room layout, public transport included, location opposite Balexert.
- https://mgallery.accor.com/en/hotels/1322.html — hotel, location, transport card.

## Hosts' contributions

Flights: £180 per couple paid by Katie & Alex as a gift. No repayment. Route, baggage and times not verified, so no invented flight itinerary. Guest cost £0.
Tour: £90 per person / £180 per couple, hosts pay upfront and guests repay without urgency. User's planning figure, not verified exact-date fare. Included in eventual total; not silently omitted because deferred.

## Day trip constraint

https://www.keytours.ch/lauterbrunnen-grindelwald-interlaken/ lists Geneva departure 07:15 and return ~21:00; free time in Grindelwald, Lauterbrunnen and Interlaken; meals and mountain transport excluded. Geneva-specific price from CHF119 (not general headline CHF59 from other origins).

Calendar inspected visually: https://www.keytours.ch/wp-content/uploads/sites/9/2026/10/interlaken-geneva-calendar.svg runs Tuesday, Thursday, Sunday, Jan–Dec. Geneva Tourism also lists these days (but an older CHF99 price): https://www.geneve.com/en/attractions/detail/excursion-from-geneva-interlaken-jungfraujoch

Saturday 20 March is the required solution for guests flying home Sunday. No Saturday departure confirmed. Published Sunday tour returns too late for a normal Sunday return flight. Page explicitly flags this before booking. User supplied a general GetYourGuide search URL, not a specific bookable tour.

Restaurant Eigergletscher is at the foot of Eiger, not the summit. https://www.jungfrau.ch/en-gb/food-drink/restaurant-eigergletscher/ says à la carte reopens to all guests from 28 November 2026. Mountain transport, fare and enough free time on this multi-stop tour all require confirmation. Optional £160–220 per couple is an incremental planning allowance for lift + meal after baseline picnic cost, not a quote or confirmed add-on.

## Food and totals

Food estimates per couple: Friday dinner £40–60; Saturday 3 meals £76–108; Sunday 3 meals £76–108; Monday breakfast/lunch £28–44. Two nights £192–276; three nights £220–320. Same spending style for both hotels. Hotel breakfast not assumed included. Monday dinner extra if late flights.

Primary menu reference: https://buvettedesbains.com/ — CHF15 daily dish, CHF27 fondue, CHF12 full breakfast. GBP ranges are planning allowances, not purported precise conversion or restaurant quote.

Both hotels include local public transport; both displayed room prices include tax. No duplicate tax added. Geneva's tourist tax is CHF4.25 per adult/night: https://www.geneve.com/de/reiseplanung/ausfluege/geneva-transport-card-for-host

Small activities £0–40 per couple; optional mountain increment separate. No guarantee of mountain activity timing. Exclusions explicitly listed: UK airport travel/parking, baggage extras, insurance, alcohol, shopping. Add personal contingency.

Base totals incl tour repayment and small-activity range:
- ibis 2 nights £529.18–653.18 (display rounded upward £530–654)
- ibis 3 nights £626.53–766.53 (display £627–767)
- MGallery 2 nights £743.38–867.38 (display £744–868)
- MGallery 3 nights £953.65–1093.65 (display £954–1094)

Skyfall comparator remains £640 accommodation contribution only, before UK food/travel/activities. Do not imply both Swiss plans are cheaper all-in or all UK houses cost more.

## Image sources

Locally downloaded, compressed JPEGs in static/images/switzerland. Destination images from free Unsplash photographs; credits linked on page. Photos show different seasons; March weather explicitly not promised.
- Grindelwald: Zhu Yunxiao https://unsplash.com/photos/a-snow-covered-mountain-with-a-village-in-the-foreground-fQyUhZhDWCA — photo-1646581767116-77b34a7ce4ce
- Lauterbrunnen: Robin Ulrich https://unsplash.com/photos/green-mountains-and-houses-during-daytime-bvSLu1Lew3Y — photo-1614981360345-07f36e817087
- Geneva: Arnaud Roch https://unsplash.com/photos/a-tall-fountain-shoots-water-over-lake-geneva-xUjq36cpeE8 — photo-1669733162960-5754c1a4470a
- Interlaken: Tucker Monticelli https://unsplash.com/photos/red-flowers-near-body-of-water-during-daytime-ORS4Y-et7xg — photo-1605825831039-8b6b4199b04a
- Actual room photos: https://www.ahstatic.com/photos/5653_rodbc_00_p_1024x768.jpg and https://www.ahstatic.com/photos/1322_rodbc_00_p_1024x768.jpg (Accor).

## Validation

Svelte check: 0 errors, 23 existing warnings. Production build passed (existing optional native dependency tracing warnings). Four cost-model tests and eight existing vote tests pass. Browser checked 390px phone layout, Sunday selection, hotel choice, mountain increment, preference restoration, modal open/Escape/focus return. Existing intro remains. No vote interactions submitted. Reduced-motion removes pulse/entrance and smooth scrolling on travel page. Pulse is two 2.2-second cycles, then stops.

## Display revision — day trip separate

At the organisers’ request, option cards, planner totals, mobile summary and copied plans now exclude the £180-per-couple excursion. Each shows a separate £90-per-person byline with the deferred repayment explanation. New displayed base ranges: ibis 2 nights £350–474, 3 nights £447–587; MGallery 2 nights £564–688, 3 nights £774–914. Earlier inclusive totals above are historical research, not current UI totals.

## Carousel photography refresh — 7 November 2026
- Grindelwald winter panorama: https://www.jungfrau.ch/en-gb/grindelwald/ (Jungfrau Railways; `Grindelwald-Winter-Wetterhorn-Mattenberg.jpg`).
- Lauterbrunnen winter panorama: https://www.jungfrau.ch/en-gb/lauterbrunnen/ (Jungfrau Railways; `Lauterbrunnen-Winter-Staubbachfall-Panorama.jpg`).
- Lake Brienz / Interlaken region: Rodrigo Curi, https://unsplash.com/photos/Q9QISW_Xu70 (Unsplash License).
- Downloaded at 1800px wide; source credits linked on the page. These are winter reference photographs, not verified March capture dates or a promise of snow coverage. Lake Brienz shot is regional scenery, not the town centre or a confirmed tour viewpoint.
- Four-slide crossfade with manual arrows, touch swipe, pause/play and reduced-motion support. First image prioritised; other slides lazy loaded. All three excursion cards now use winter imagery.
