# Center Parcs Whinfell Forest research

Checked **10 November 2026**, mostly on centerparcs.co.uk, for **Fri 19 – Mon 22 March 2027** (3 nights, 13 adults + 1 baby, 3 lodges). Where a fact comes from somewhere other than Center Parcs, it says so.

Image URLs all use Center Parcs' Scene7 CDN: `https://centerparcs.scene7.com/is/image/centerparcs/<NAME>?qlt=80&wid=1200`. **Every URL below was checked with curl and returned `200 image/jpeg`.** An asset that doesn't exist returns `403 text/plain`. The asset names come from centerparcs.co.uk HTML and the things-to-do JSON feed. Names with "WF" in them are Whinfell photos. The rest are stock Center Parcs photos from other villages that Center Parcs itself uses on the Whinfell listing.

How the data was found: the things-to-do page reads a JSON feed filtered by village code. Whinfell is `WF`:
- Activities: https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/_jcr_content/root/responsivegrid/searchresults.model.browse.json/WF/activities (169 items)
- Restaurants: same URL ending `/WF/restaurants` (17 items)
- Spa: same URL ending `/WF/spastreatments` (50 items)
- Lodge types at WF: https://www.centerparcs.co.uk/api/v1/content/graphql/execute.json/lodge-titles;villageCode=WF

## 1. Village basics

- **Address:** Center Parcs Whinfell Forest, Penrith, Cumbria **CA10 2DW**. It is "just minutes from Junction 40 of the M6". If you're not arriving by car, the arrivals help line is **01768 893 009**. Village FAQ: Penrith is "around a 15 minute drive".
- **Arrival day (Fri 19 Mar):** you can enter the village from **10am**. Go to the Arrivals Lodge to get a wristband, which is your lodge key and also opens the pool lockers. Lodge access times are staggered:
  - Woodland Lodges from **4pm**
  - Forest Lodges from **3pm**
  - **Exclusive Lodges from 2pm** (early arrival is included)
  - Treehouses from 1pm
  - Paid "Early Arrival" moves any lodge's access two hours earlier.
- **Departure day (Mon 22 Mar):** you must be out of the lodge by **10am**. You can keep using the village facilities **until midnight**. To leave, drop the wristbands in the boxes by the departure barrier.
- **Car policy:** the village is car-free. Park in the main car park.
  - On arrival day, once your lodge is open, you can drive to it to unload, then take the car back to the car park. The lodge FAQ says cars must be back in the main car park by **10pm**.
  - On departure day, the barrier is raised **before 10am** so you can drive to the lodge and load up.
  - To leave the night before, collect a car pass from Security. It gives you up to 1 hour at the lodge from 4pm.
  - **Exception:** guests in "adapted lodges, Treehouses and Exclusive lodges can leave cars outside the lodge" (arriving-for-your-break page). The Exclusive Lodge page lists "Dedicated parking nearby", so House 1 should have its own parking.
  - The speed limit on the village is 10 mph.
  - EV charge-point pre-booking is mentioned only for Sherwood, Woburn and Elveden.
  - Accessible shuttle: 8am–11pm at Whinfell.
- **Train:** Center Parcs doesn't publish a train station. The nearest is **Penrith (Penrith North Lakes)**, on the West Coast Main Line, about 15 minutes away by road. That comes from Center Parcs' own drive-time figure plus third-party sources (Wikipedia; Junior Magazine says a taxi is "under 10 minutes"). Center Parcs only says "if you aren't arriving by car… call 01768 893 009".
- **Booking-related:**
  - Groups of **10 or more people** booking accommodation are asked to fill in a form.
  - Children over 2 need their own bedroom space. Infants under 2 don't.
  - The balance is due 10 weeks before the break.
  - Flex Your Stay can only be added at booking or within 14 days of it.
- **Other:** the village is cashless. Wi-Fi is free in lodges and across the village. There are no laundry facilities. The village map PDF is https://www.centerparcs.co.uk/content/dam/centerparcs/maps/download-map/Whinfell-Forest-Village-Map.pdf

Sources:
- https://www.centerparcs.co.uk/discover-center-parcs/holiday-locations/whinfell-forest.html
- https://www.centerparcs.co.uk/discover-center-parcs/short-breaks/first-time-guests/arriving-for-your-break.html
- https://www.centerparcs.co.uk/discover-center-parcs/short-breaks/what-to-do-on-arrival.html
- https://www.centerparcs.co.uk/discover-center-parcs/short-breaks/first-time-guests/preparing-for-your-break.html
- https://www.centerparcs.co.uk/discover-center-parcs/short-breaks/first-time-guests/booking-a-break.html
- https://www.centerparcs.co.uk/discover-center-parcs/lodge-holidays.html

## 2. Adult and group activities at Whinfell

All of these appear in the `WF` activities feed. **Center Parcs only publishes a "guide price" band publicly** (£0–£15, £16–£25, £26–£35, £36+); the exact price only appears after you sign in to a booking. That's why prices below are bands. Min age is the published minimum.

| Activity | Where | One line | Guide band | Min age / limits | Image (`<NAME>`) |
|---|---|---|---|---|---|
| Ten Pin Bowling | Leisure Bowl | Classic bowling | not shown | Listed min 8. Up to 8 players and up to 2 games per booking; call the Contact Centre to add a player | `LF%20LEISURE%20BOWL%208` |
| Late Night Lanes | Leisure Bowl | DJ-hosted late-night bowling with interactive games and challenges | £16–£25 | 8+. **6 people per lane; you may share a lane with another party** | `Leisure%20Bowl%20LF%2002%20RT` |
| Escape the Forest: The Plant Room | Escape the Forest | Escape room **exclusive to Whinfell**: fix the Plant Room before the village powers down | £36+ | **Max 6** per room. A paying adult 18+ must be present | `Leisure.Escape%20the%20Forest.Forest%20Laboratory.WO.20.03.24.NNewbold.Perpetuity.62-1` (Woburn set) |
| Escape the Forest: Forest Laboratory | Escape the Forest | Indoor woodland escape room full of puzzles | £36+ | **Max 6**. Adult 18+ must be present | `Leisure.Escape%20the%20Forest.Forest%20Laboratory.WO.20.03.24.NNewbold.Perpetuity.30-1` |
| SingPods | Leisure Bowl | Private soundproof karaoke pod, 30 or 60 min | £36+ | 3+. **Max 6 per pod**; the page says "from 9 May our SingPods will be expanding… up to 12 people" (no year given) | `SINGPODS%202` |
| The ARENA | Entertainment Hive (Whinfell only) | Glass arena of agility, reaction and puzzle games (25 or 55 min) | £16–£25 / £26–£35 | All ages | `ENTERTAINMENT%20HIVE%20-%20THE%20ARENA%20-%20WF%203` |
| Interactive Darts | Entertainment Hive | Augmented-reality darts with live scoring | not shown | **12+**. Groups of up to 8 | `1I9A3077-1` |
| Puttify | Entertainment Hive | Neon, tech-scored mini golf; allow 45 min | £0–£15 | All ages | `puttify_entertainment_hive` |
| Quad Bike Safari 16+ | Outdoor Activity Centre | Off-road quad track with an instructor; 40 min of driving | £36+ | **16+**. Max 138 kg. Up to a 35-min walk from the village centre | `Summer%20brand%20shoot.%20SF.%20Junior%20Quads.%20CCornwell.015%2010%2008%2023-3` |
| Segway Experience | Outdoor Activity Centre | Training track, village ride, then off-road bits | £36+ | **12+**. 45–118 kg | `Segways%20in%20Forest%20Woburn%20Forest%20Brand%20August%202016%2004-1` |
| Paintball | Outdoor Activity Centre | Classic woodland paintball; paintballs included | £36+ | **12+** | `Paintball%20WF%2035-1` (Whinfell) |
| Laser Clay Shoot Out | Outdoor Activity Centre | Laser rifles against flying clays | £26–£35 | 10+ | `LASER%20CLAYS09-1` |
| Archery (Target / Field / Crossbows) | Outdoor Activity Centre | Target bullseyes, a woodland course with animal targets, or crossbows | £26–£35 (target, crossbows), £36+ (field) | 10+ (crossbows 12+). Field archery: no spectators | `Summer%20brand%20shoot.%20SF.%20Target%20archery.%20School-age.%20CCornwell.002%2010%2008%2023-4` |
| Aerial Adventure | Aerial course | Treetop ropes course up to 12 m, finishing on **the only zip wire across the lake** | £36+ | 6+. Min height 1.22 m, max 114 kg. For big groups, book back-to-back 15-min slots | `Summer%20brand%20shoot.%20SF.%20Aerial%20Adventure.%20School-age.%20CCornwell.002%2010%2008%2023-4` |
| Falconry | Falconry area | Learn about, and fly, owls, hawks and falcons | £16–£25 | 8+. **October–March at Whinfell it runs undercover, with smaller-scale flying** | `Junior%20Falconers%20Club%20SF%20116-1` |
| Adventure Golf (18 holes) | Adventure Golf course | Themed crazy golf; allow about 1 hour | £0–£15 | 3+ | `Whinfell%20-%20Adventure%20Golf%20School%20age%20%2025%2001%20%2023%20%20007-1` (Whinfell) |
| Golf Driving Range | Outdoor Activity Centre | "Unique to Whinfell Forest": 2 clubs and 80 balls | £0–£15 | 6+ | `Golf%20Driving%20Range%20SF%2017-1` |
| Aqua Sana Forest Spa | Aqua Sana | 14 spa experiences (saunas, steam, outdoor hot tubs, outdoor pool). 3-hour "Forest Spa Experience" and longer packages | Day-visitor packages on aquasana.co.uk are "from £69" (Sparkling Spa Escape) to "from £189" (Signature spa days). In-village price not public | **14+** (some packages 18+) | `Aqua%20Sana%20Outdoor%20Pool%20November%202018%20WF%2002` (Whinfell) |

Also at Whinfell (`WF` feed), useful for groups:
- **The Bat Cage**: cricket, baseball and tennis simulators in the Entertainment Hive, 5+, £26–£35 / £36+. Image: `ENTERTAINMENT%20HIVE%20-%20THE%20BAT%20CAGE%20-%20WF%205`
- **Interactive Shuffle**: shuffleboard, 25 or 55 min, in the Entertainment Hive.
- **Curling**: synthetic lanes, Sports Plaza, £26–£35.
- **American Pool**: Sports Café or Leisure Bowl, 30 min, £0–£15.
- **Arcade Bowls**: max 8 players, £26–£35.
- **Laser Combat**: 6+, £36+.
- **Indoor Climbing Walls**: Sports Plaza.
- **Pottery Painting**: £26–£35 table fee, max 4 per table, pieces from £15.
- **Cabana for 8**: in the pool, £36+, max 8 (under-2s not counted).
- **Electric boat, 6 seats**: The Boathouse, £26–£35, **min age 4 months**, the 6 includes babies.
- **Pedalos, kayaks, Katakanu.**
- **Stand Up Paddleboard tuition**: "runs spring to summer, subject to water temperature", so **probably not running in mid-March**.
- **Geocache**: groups up to 4.
- **Badminton, squash, tennis, pickleball, table tennis.**
- **Gym** (section 6).

Not found at Whinfell: there's **no snooker listing** (only American pool), no padel, no TAG Arena, no Treetop Glider, no treetop sauna.

Sources:
- the `WF` activities feed above
- individual pages, e.g. https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/activities/escape-the-forest-plant-room.html/WF
- https://www.centerparcs.co.uk/discover-center-parcs/restaurants/entertainment-hive.html
- https://www.aquasana.co.uk/spa-locations/whinfell-forest.html

## 3. Baby and toddler activities

All are in the Whinfell feed and run at the **Activity Den** unless noted. One adult per child.

| Activity | Ages | One line | Band | Image |
|---|---|---|---|---|
| Sensory Play Babies | **2–12 months** | Gentle textures, sounds, colours and nursery rhymes | £0–£15 | `Sensory%20Play%20Babies%20Oct%202014%20WF%2010-2` (Whinfell) |
| Sensory Play Toddlers | 13–36 months | Multi-sensory session with songs | £0–£15 | `SENSORY%20PLAY%20TODDLERS%20002-1` |
| Baby Balance Bike Buddy | 10 months – 2 years (must stand unaided) | Baby balance trikes on a little course | £0–£15 | `Baby%20Balance%20Bikes%20October%202019%20WO%2026-2` |
| Baby Imprints | No minimum (newborns welcome) | 3D cast of baby's hand or foot. **Only bookable on day 1 or 2**; collect on departure day | £36+ | `Memorable%20Imprints%20-%20Baby%20Imprints%20%20003%2029%2003%2023-1` |
| Mucky Pups | 18 months – 5 years | Messy play: painting and water | £0–£15 | `Mucky%20Pups%20April%202014%20SF%2016-1` |
| Mini Musical Movers | 18 months – 5 years | Singing, instruments, dancing (The Studio, Sports Plaza) | £0–£15 | `Mini%20Music%20Lovers%20October%202014%20WF%2015-1` (Whinfell) |

No toddler swim session is listed for Whinfell. The only pool activities in the feed are Mini Jet Skis (3+), Aqua Jetting (8+) and Cabanas.

What is free for babies:
- buoyancy aids at the pool
- a children's water play area
- Ella's Kitchen baby food in restaurants and to take away
- warming stations
- indoor soft play in Bella Italia, Café Rouge, The Lakeside Inn and Huck's
- the free children's disco at Leisure Bowl

Baby Owls (meet Pop the barn owl) is from age 1 if Theo is old enough.

## 4. Subtropical Swimming Paradise (Whinfell)

- **Included:** unlimited entry for every guest, no booking needed.
- **Hours:** 9am–8pm daily. **Quiet hour** is Wednesdays and Sundays at 9am (no waves, music or rides). So Sun 21 Mar, 9–10am, is quiet.
- **Whinfell rides:** **Tropical Cyclone** (100 m, 4-person raft; at Whinfell minimum 2 riders, max 320 kg, height 1.22 m), **Canyon Ride**, **Indoor Rapids**, flumes, wave pool, outdoor pool (open all year), whirlpools, and a children's water play area. **Whinfell has no lazy river** (village FAQ).
- **Temperature:** 29.5°C.
- **Food:** Canopy Café and Bar inside the pool. The pool page lists Starbucks-in-the-pool only at Woburn, Elveden and Sherwood.
- **Lockers:** your wristband is the locker key. Family changing, baby changing and Changing Places facilities are available.
- **Bring:** your own pool towels (hire costs £3) and swim nappies (sold at the Pool Info Desk).
- **Supervision:** "Children 4 years old and under must have one adult per child". From 8 years old children can swim unsupervised.
- **Cabanas** (Whinfell has one for 8 people and an accessible one for 8): a private room with a TV, safe, towels and soft drinks.

Images:
- `Lake%20STSP%20Drone%20WF%20July%202021%201-1`: aerial of the pool dome next to the lake
- `wf-overview-gallery-stsp`: inside, palms and the main pool
- `STSP%20Drone%20WF%20July%202021%204-1`: aerial of the outdoor pools and slide tubes
- `WF_couple_pool_gallery-1`: a couple in a pool. **It's on the Whinfell page but may be the Aqua Sana pool**

Sources:
- https://www.centerparcs.co.uk/discover-center-parcs/activities/subtropical-swimming-paradise.html
- the Whinfell village FAQ
- https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/activities/cabana-for-eight.html/WF

## 5. Bikes

- **Where:** the Cycle Centre.
- **What's available:** adult and junior mountain bikes, tandems, tag-alongs, trailers (for babies or luggage), three-wheelers, and electric bikes at "most" villages. Helmets and locks are free with every hire.
- **Bringing your own bikes:** **yes**. Center Parcs recommends bringing a lock. E-scooters and hoverboards are banned; e-bikes are allowed.
- **Price:** not public. "Prices and availability are shown when booking". You "save up to 37%" if you add cycles at the same time as booking the accommodation. You can also book them later, from 12 weeks before arrival.
- **Collection times:**
  - The Cycle Centre page body says pre-booked bikes can be collected **11am–8pm on arrival day**, 9am–5pm on other days, and must be returned 8–10am on departure day.
  - The same page's FAQ says "from 2pm on your arrival day, or from 11am if you've booked early arrival".
  - **The two disagree.** Check the booking confirmation.
- **Advice:** Center Parcs says cycles are "very popular", so pre-book them.
- **Route map:** a Whinfell cycle-route PDF is linked from the Cycle Centre page. Whinfell "does have some hills" but the paths are smooth.
- **Image:** `Boys-Cycling-Outside-Accommodation-Forest-October-2014-WF-02` (Whinfell).

Source: https://www.centerparcs.co.uk/discover-center-parcs/shops/cycle-centre.html

## 6. Gym

- Whinfell **has a gym**. The activity pages give its location only as "The Gym"; they don't say which building. Every village gym has cardio and resistance machines and **no free weights**. Bring a water bottle. You get the door code from the booking desk and fill in a medical questionnaire.
- **Min age 16.** Every person needs their own pass.
- **Two products in the `WF` feed:**
  - **Gym Pass** (`FITRMMW`): "access… for up to two hours per day during your break". The booking-extras page describes the pass as "up to 90 minutes a day".
  - **Gym Pass 90 Minutes** (`FITRM90`): a single 90-minute session.
  - Both are in the **£0–£15** guide band. You can add the pass as a booking extra or book it with activities.
- **The organiser's £15 each:** this **fits the official band (£0–£15)** but **can't be confirmed exactly**, because Center Parcs only shows the real price once you're signed in. A third-party blog (insideoursuitcase.com) also quotes **£15 per person** for the stay pass. Nothing contradicts £15.
- Image: `Winter%20Shoot.%20SF.%20Leisure.%20Jardin%20Des%20Sports.%20The%20Gym.%20CCornwell.%2020.02.24.%20Perpetuity_001-3`. This is Sherwood's gym; no Whinfell gym photo was found.

Sources:
- https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/activities/the-gym-midweek-pass.html/WF
- https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/activities/gym-pass.html/WF

## 7. Restaurants, bars and cafés at Whinfell

From the `WF` restaurants feed and the restaurants page:

- **Huck's American Bar & Grill**: burgers, grills and cocktails. Open daily 4–10pm, with a lunch menu Mon and Fri 12–3pm. 3-course Experience Menu **from £25.95**. Soft play. Image: `Group%20Shot%206L`
- **Rajinda Pradesh**: Indian. **Open Tue–Sun** 4–10pm, so **closed Monday**. Experience Menu from £25.95. Image: `Rjinda%20Curry%20Selection%20and%20Rice_DW`
- **Bella Italia**: classic Italian, daily 12–10pm, lunchtime deal, indoor play area. Also does **collection/takeaway**. Image: `bella_italia_thumb`
- **Café Rouge**: French bistro, daily 9am–10pm, £12.95 lunch menu with a soft drink, afternoon tea for 2, indoor play area, Sunday roast. Image: `cafe-steak-thumb`
- **The Lakeside Inn** (Whinfell only): pub classics by the lake, daily 9am–10pm, Sunday roast, afternoon tea Mon–Sat 12–5pm. Indoor play area, dog-friendly terrace. Images: `Lakeside%20Inn%20WF%2005-1`, `Pork%20Belly%20Lakeside%20Inn%20January%202020%2002-1`
- **The Pancake House**: sweet and savoury pancakes, waffles, omelettes. Open daily from 8:30am. Pre-booking is recommended. Image: `Pancake%20House%20Cookie%20Monster%20Pancake_DW_1A`
- **Sports Café** (Sports Plaza): food, live sport, beer and wine. Open 9am–11pm, walk-in.
- **Entertainment Hive** (Whinfell and Woburn only): Detroit-style pizza, loaded waffle fries and drinks next to the games. **No booking, just turn up.** Image: `ENTERTAINMENT%20HIVE%20-%20F%20AND%20B%20WITH%20MODELS%20-%20WF%206` or `ENTERTAINMENT%20HIVE%20-%20WF%202`
- **Dexters Kitchen** (Whinfell only): breakfast sandwiches, burgers and hot dogs, to eat in or take away.
- **Canopy Café and Bar**: inside the pool.
- **Leisure Bowl bar**: drinks and snacks.
- Starbucks: the restaurants page lists Starbucks at "all locations".

**Restaurant Runner (lodge delivery):** mix-and-match dishes from several restaurants, delivered daily 4:30–10pm (last slot 9:30pm). **You can only order on the day you want it**, and slots go first come, first served. Image: `Restaurant%20Runner%20Rajinda%20Hero%20shot%2007%2006%202022%20007-1`

**Pre-booking tables:** tables can be booked **up to 12 weeks before arrival** on the website or app, and it's advised. Details from the restaurant pages:
- A deposit is required. "From breaks starting 16 November 2026, a **£5 deposit** will be required… redeemed against your bill". The Huck's page says the deposit is per person.
- If you cancel more than 48 hours ahead, the deposit is refunded. Inside 48 hours it isn't.
- **Group rule (Huck's/Lakeside pages): "Groups should make a single booking for the full party size. We cannot guarantee that separate bookings will be seated together." and "If you're trying to make a reservation for 13 or more people, your booking will turn into a request that will need to be approved by the restaurant."** Requested times for groups "are not guaranteed". **Our 14 (13 adults + baby) will therefore be a group request.**

Sources:
- https://www.centerparcs.co.uk/discover-center-parcs/restaurants.html
- `WF` restaurants feed
- https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/restaurants/hucks-american-bar-and-grill.html/WF
- https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/restaurants/the-lakeside-inn.html/WF
- https://www.centerparcs.co.uk/discover-center-parcs/things-to-do/restaurants/restaurant-runner.html/WF

## 8. Booking windows and group tips

- **Activities, restaurants and spa treatments open 12 weeks before arrival** in My Booking or the app. For arrival on Fri 19 Mar 2027, 12 weeks earlier is **Fri 25 December 2026** (Christmas Day). This date is my arithmetic, not stated by Center Parcs. Check the exact opening date in My Booking.
- **Adding guests:** add every guest's email to the booking. Each of them can then book activities and restaurants, and everything lands on a **shared itinerary**. All guest details, including children's dates of birth, must be entered before anyone can book activities.
- **Selling out:** "Some activities fill quickly". "Popular activities can become fully booked". Early-evening restaurant slots are named as the ones to grab. Cycles are "very popular". You can also book on the village via the app or booking desks, which close in the evening.
- **Group sizes in published rules:**
  - Bowling: 8 per booking
  - Late Night Lanes: 6 per lane (may share)
  - Escape rooms: 6
  - SingPods: 6 (to become 12)
  - Arcade Bowls: 8
  - Interactive Darts: 8
  - Family Karts: 6 per session
  - Cabana: 8
  - Electric boat: 6
  - Pottery: 4 per table
  - Geocache: 4
  - Aerial Adventure: book adjacent 15-min slots to go round together
- **Our group of 13+1 has to split into sub-groups of 6–8** for most things.
- **No "private hire" bowling or whole-venue group product was found** on the public site.
- **Accommodation:** groups of 10+ are asked to fill in a form. Multiple lodges can choose locations "nearby or next to each other".
- **Visitor Day Passes** are available for non-staying friends.

## 9. Gallery and hero images (all verified, all Whinfell)

| Use | `<NAME>` | What it shows |
|---|---|---|
| Hero | `Lake%20STSP%20Drone%20WF%20July%202021%201-1` | Aerial: the glass pool dome beside the lake, surrounded by pine forest |
| Hero alt | `WF-updated-thumbnail-1` | Aerial at dusk: the lake, the Boathouse and endless pine forest, with hills behind |
| Gallery | `Lake%20Drone%20WF%20July%202021%201-1` | The Boathouse across the lake, with rows of pedalos at the jetty |
| Gallery | `wf-overview-gallery-boathouse` | Misty morning by the lake: the pool dome with canoes and kayaks in front |
| Gallery | `wf-overview-gallery-stsp` | Inside the Subtropical Swimming Paradise: palms, rocks and turquoise water |
| Gallery | `STSP%20Drone%20WF%20July%202021%204-1` | Aerial of the outdoor pools and slide tubes |
| Gallery | `CP_WF_Nature_34` (portrait) | Tall Scots pines lining a quiet village path |
| Gallery | `CP_WF_Nature_32` | Sun through the pine canopy, looking up |
| Gallery | `Red%20Squirrel%20Walk%20WF%2004` | Red squirrel. Whinfell is a red squirrel sanctuary |
| Gallery | `Aqua%20Sana%20Outdoor%20Pool%20November%202018%20WF%2002` | Aqua Sana outdoor spa pool |
| Gallery | `2%20Bed%20Woodland%20Lodge%20Detached%20WL2D%20Exterior%20WF%20September%202017%2001-1` | Dark-timber Scandinavian woodland lodge among pines |
| Gallery | `luxury-exclusive-patio-gallery` | Exclusive Lodge patio with hot tub and loungers (village not stated, see section 10) |

## 10. Lodge identification and imagery

Lodge types at Whinfell (from Center Parcs' `lodge-titles;villageCode=WF` data) and the likely matches:

- **House 1: 4-bed with hot tub, sauna and games room, about £2,249 → "4 bedroom Exclusive Lodge with games room" (code `ZL4G`).**
  - Whinfell also has a plain "4 bedroom Exclusive Lodge" (`ZL4N`). The Exclusive page says all Exclusive Lodges have "a games room with pool table, apart from some at Whinfell Forest". Ours has a games room, so it's `ZL4G`.
  - Features: private hot tub, sauna, **steam room**, games room with pool table, en-suite to every bedroom, wine cooler, coffee machine, **dedicated parking nearby** (car can stay at the lodge), **access from 2pm**.
  - Confidence: high. It's the only Whinfell 4-bed type with hot tub, sauna and games room. The other Whinfell hot-tub types are the 3-bed Forest Lodge with hot tub and the Treehouse, which has no sauna.
  - Image: `luxury-exclusive-patio-gallery`, which Center Parcs uses for the Exclusive Lodges card **on the Whinfell page**. The photo itself isn't labelled with a village. No Whinfell-labelled Exclusive exterior exists on the CDN (I tried several plausible "…Exclusive…WF…" names and all returned 403).
  - Alternatives: `SF%20LODGE%20HOT%20TUB%205` (hot tub at night, Sherwood, used on the Whinfell page's "Hot Tub Lodges" card) or `4%20Bed%20Exclusive%20Hot%20Tub%20WO%20July%202014%2004-1` (Woburn).
- **House 2: 2-bed "budget" lodge, about £659, and House 3: 2-bed lodge, about £649 → most likely both 2-bedroom Woodland Lodges** (the entry-level type, **access from 4pm**).
  - Whinfell's 2-bed variants are:
    - Woodland Lodge (`WL2N` / `WS2N`, terraced)
    - Woodland Lodge, detached (`WL2D` / `WS2D`)
    - Woodland Premium Lodge (`WA2N` / `WA2D`)
    - Forest Lodge (`XS2` / `XS2B` / `XS22`, access 3pm)
  - Our two prices are £10 apart and both sit at the bottom of the range, so they're probably two Woodland Lodge variants (for example terraced and detached). **I couldn't confirm which**: the live price search is client-side and wasn't readable.
  - Woodland Lodges: bedrooms sleep 2 each, in a mix of double and twin. They have a log burner in many, a brick-built barbecue stand, a dishwasher, a cot and a highchair.
  - Images (both Whinfell Woodland exteriors):
    - House 2: `2%20Bed%20Woodland%20Lodge%20Detached%20WL2D%20Exterior%20WF%20September%202017%2001-1` (single-storey dark-timber lodge among pines)
    - House 3: `3%20Bed%20Woodland%20Lodge%20Two%20Storey%20WL32%20Exterior%20WF%20September%202017%2003-1` (similar style, two-storey). It's a 3-bed photo, so it shows the look of the lodges, not our exact unit. Alternatively reuse the WL2D image.
  - Other Whinfell lodge images:
    - `3%20Bed%20Executive%20Lodge%20Two%20Storey%20XL3D%20Exterior%20WF%20September%202017%2004-1` (Forest Lodges on a pine-lined path)
    - `grand-forest-lodge-WF-living-area-2-gallery-1` (Grand Forest interior)
- Not used: `4-bed-exclusive-exterior-gallery` returns 200 but shows a yellow-brick lodge that **doesn't look like Whinfell's** Scandinavian timber style.

## 11. Bedding, towels, bed sizes and what to bring

- **Bed linen: provided** ("Bed linen ready for your arrival"; Exclusive Lodges have "luxury linen in all bedrooms"). **Towels for use in the lodge: provided.** They aren't changed during a short break; extras cost money from Guest Services. **Pool towels are not provided**: bring your own or hire them for £3.
- **Cot: in every lodge**, plus a **highchair** and a children's bathroom step. **Cot linen is NOT provided, so bring it.** Bed rails are available on request from Guest Services.
- **In every lodge:** hairdryer, iron and ironing board, TV, Wi-Fi, shaver plugs, safe.
- **Kitchen:** fridge-freezer, oven, 4-ring hob, microwave, kettle, toaster, dishwasher, pots and pans, crockery, glassware, plus **3 dishwasher tablets, 1 tea towel, 1 washing-up liquid sachet and a small amount of tea and coffee**. Bring more, or buy it at ParcMarket (free lodge delivery on £50+).
- **Outdoors:** private patio, table and chairs, and a brick-built barbecue stand or gas barbecue (varies by type). Bring charcoal or a disposable barbecue, or buy the "Family Barbecue Pack" extra (2 disposable barbecues). Fire logs are an optional extra.
- **Official "what to pack" list:**
  - toiletries
  - board games
  - your own bikes and lock (optional)
  - milk, tea and coffee for the first cuppa
  - clothes for all weather (wellies, raincoats)
  - swimwear, pool towels, goggles, flip-flops
  - for babies: pushchair, bottles, **swim nappies**, **cot linen**
  - "Some things you don't need": a step stool, a high chair. Free Ella's Kitchen baby food is available in restaurants.
  - No laundry on site. Cashless village.
- **Bed sizes and twin beds:** **Center Parcs doesn't publish mattress sizes or say whether twin beds can be pushed together.** The pages only say "All bedrooms sleep up to two guests, with lodges containing a mix of double and twin beds", and that floor plans are representative: "we are unable to change the bed composition or layout". **Unconfirmed: ask Guest Services (Whinfell 01768 893 009) if it matters.**

Sources:
- https://www.centerparcs.co.uk/discover-center-parcs/short-breaks/whats-included.html
- https://www.centerparcs.co.uk/discover-center-parcs/short-breaks/what-to-pack.html
- https://www.centerparcs.co.uk/discover-center-parcs/lodge-holidays.html (FAQ)
- https://www.centerparcs.co.uk/discover-center-parcs/lodge-holidays/accommodation-type/luxury-exclusive-lodges.html
- https://www.centerparcs.co.uk/discover-center-parcs/lodge-holidays/accommodation-type/woodland-lodges.html

## Unconfirmed / flags

- Exact activity, gym and cycle prices: only guide bands are public. The gym band £0–£15 fits the organiser's £15 but isn't proof of it.
- Which 2-bed lodge types the £659 and £649 bookings are.
- Twin beds pushed together, and mattress sizes: not published.
- Bike collection time on arrival day: the Cycle Centre page contradicts itself (11am vs 2pm).
- SingPod capacity (6 now, "12 from 9 May", year unstated).
- Stand-up paddleboarding probably isn't running in March. Falconry runs undercover October–March.
- Penrith station is from third-party sources plus Center Parcs' "15 minute drive"; Center Parcs doesn't name it.
- The Exclusive Lodge image isn't labelled as Whinfell (see section 10).
