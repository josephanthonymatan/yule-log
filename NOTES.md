# Yule Log: design notes

Why the app is the way it is. [`README.md`](README.md) covers what it does and how to work on it.

## Round 1: which art style?

**Verdict: 8-bit pixel art.** Woodblock, paper and stained glass are deleted.

## Round 2: which room?

**Verdict: Hood for Russian Hill, River rock for Tahoe.** The other four rooms are deleted. They reached for tile, a limestone surround, clinker brick and granite; the Pendleton blanket from the Granite room was kept.

The Time, Sky, Season and Decor buttons stay, for visitors, tucked into a small menu with a way back to live.

## Round 3: what's on the mantel

| | Russian Hill | Tahoe City |
| --- | --- | --- |
| All year | Green bottle of mezcal | Bottle of whiskey, Pendleton blanket, sheepskin, small trout |
| Oct 15 to 31 | Jack-o'-lantern, baseball | Same |
| November | Plain pumpkin, dried corn, football | Same |
| Dec 1 to Jan 6 | Garland, wrapped gift, bowl of oranges | Garland, wrapped gift |
| Otherwise | Bowl of fruit: oranges in winter, grapefruit in spring, peaches in summer, pomegranates in autumn | Nothing extra |

- The jack-o'-lantern is lit from about sunset through the night, at the place's time. It's out by dawn.
- Russian Hill's window keeps its size and the fireplace takes all the remaining room (`fireFirst` in the layout). The urn sits at the far right, under the window.
- Grey fishing boats are about a third of the traffic on the Bay. They stay in port in heavy rain or high wind.
- Previewing another season with Decor on Live shows it without a holiday, so the fruit can be seen.

## Decisions to carry forward

- The fire is the same natural orange everywhere and never changes with the season. Wood is by place, and changes only the sound and the logs.
- The window shows the place's time, not the viewer's. Sun and moon are computed for the place and only drawn if they are really in that slice of the sky.
- Seasons belong in the window (gold or green hills, snow on the pines, sailing weather). Holidays are a small touch on the mantel.
- Sound is synthesised and never audibly loops. Crackle gains are heavy-tailed and bursty, and the same events throw sparks.
- This is not a white noise machine. The fire is only its crackle, with no roar or hiss under it. Clear, clouds, fog and snow make no continuous sound; foghorns, ship horns and owls still come and go. Rain is separate drops with a trace of air under them. Continuous noise is kept for wind, which comes in gusts with near-silent lulls, and for storms, which stay as they were.
- Time is real. The sun comes from UTC and each place's coordinates, and the clock from its IANA time zone, so daylight saving is handled. Sunrise and sunset matched Open-Meteo's to within 20 seconds on seven dates, including both clock changes. The moon's phase is good to within a day, but its position is approximate.

## Live data

- Open-Meteo is a forecast model for that spot, not a sensor on Russian Hill.
- San Francisco's fog is measured, because forecast models rarely see it. NOAA's visibility sensor at Pier 17 (Oakland Berth 38 as the spare, airports as the last resort) sets fog on the water. The lowest broken or overcast cloud at Oakland airport (SFO as the spare) sets a deck that cuts the hills at its real height, at about ten metres a row in the window. All of these allow browser requests and need no key; the NOAA data is public domain.
- In July and August 2026 Pier 17 read under 4 km in only 1 to 2% of hours, while Oakland's cloud base was under 300 m in 12 to 19%. So the deck is what most fog days look like. The airport is 15 km away, so a deck can be wrong for Russian Hill.
- The sensors miss the murk around rain. On Nov 3, 2026 a photo from Russian Hill at 8:14 showed Alcatraz washed out and Angel Island nearly gone, while Pier 17 and Berth 38 read their 10 km maximum and Oakland and SFO reported 10 miles under cloud at 5,000 to 6,000 ft. Pier 17 read 10 km for 99.8% of the previous 30 days, so a 10 means "no dense fog at the pier", not "clear". So during rain and for 45 minutes after, the forecast's low cloud and humidity can raise the fog, capped at 0.65. Dry days still follow the sensors.
- "Foggy" here includes a really low, thick marine layer, not only hidden land. That's the owner's definition, and the sensors barely register it.
- So Jev (`jev-1.14.0`) judges the Crissy Beach camera: "Is it foggy in `photo`, counting a low, thick marine layer as fog?" At 0.7 or above the window shows fog at 0.6; at 0.3 or below the forecast's estimate and the airport deck are dropped, though a visibility sensor reading real fog stays. Between those, after dark and in storms, the other sources decide. Those are the thresholds TypeSafe suggests starting from, not tuned ones.
- The evidence is thin. On Nov 3, 2026 the owner labeled 30 frames: 26 foggy, 3 not, 1 can't tell. Jev beat GPT-6 Luna on the marine-layer question, 25 of 29 to 19 of 29 at a 0.5 cut, but always saying "foggy" would score 26. Across the 10 Crissy frames, Jev's 0.7 and 0.3 thresholds gave 6 firm answers, all matching the labels, and 4 unsure. It hasn't been tested on a clear sunny day, and the wording was chosen on these same frames. The Turn fog button is there because it will sometimes be wrong.
- The Crissy camera's address (`parksconservancy.siteproxy.net/api/live`) is undocumented, and visitors to the Conservancy's page can pan it, so Jev may be judging a different view at times. Caltrans cameras (`cwwp2.dot.ca.gov/data/d4/cctv/`) are the official alternative, but at 320×260 they're under Jev's 280-pixel minimum and would need enlarging on the server. TypeSafe calls image support prototype-grade, so its format may change.
- Cost is about $0.45 a month if the site is watched around the clock, measured from 3,679 input tokens per frame at $0.042 per million.
- Tahoe's fog, and San Francisco's if all four sources fail, is still inferred from Open-Meteo's low cloud, humidity and visibility. In October that estimate called fog for 61 of 733 hours in San Francisco when Pier 17 saw none, though given how rarely Pier 17 reads below its maximum, some of those hours may have been real.
- With no network, San Francisco's fog is a coin toss, as first briefed. Real fog is far rarer.
- Ships are simulated, not real traffic. Real AIS data would need a paid key and a server.

## Public site

- Fonts are bundled so that offline works and Google isn't contacted.
- Each visitor's browser fetches its own weather. Open-Meteo counts its limits by IP address and application, so a shared limit is possible if the site gets popular. A small caching service would fix that.
- `vercel.json` redirects the site's first address, yule-log-on.vercel.app, to the current one.

## Not done yet

- The new drizzle and gusts have only been measured, not heard.
