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
- Tahoe's fog, and San Francisco's if all four sources fail, is still inferred from Open-Meteo's low cloud, humidity and visibility. In October that estimate called fog for 61 of 733 hours in San Francisco when Pier 17 saw none.
- With no network, San Francisco's fog is a coin toss, as first briefed. Real fog is far rarer.
- Ships are simulated, not real traffic. Real AIS data would need a paid key and a server.

## Public site

- Fonts are bundled so that offline works and Google isn't contacted.
- Each visitor's browser fetches its own weather. Open-Meteo counts its limits by IP address and application, so a shared limit is possible if the site gets popular. A small caching service would fix that.
- `vercel.json` redirects the site's first address, yule-log-on.vercel.app, to the current one.

## Not done yet

- The new drizzle and gusts have only been measured, not heard.
