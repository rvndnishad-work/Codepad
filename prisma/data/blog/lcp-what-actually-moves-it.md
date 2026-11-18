---
slug: lcp-what-actually-moves-it
title: "What Actually Moves LCP: Nine Hero Image Setups Measured in Chromium"
excerpt: Largest Contentful Paint splits into four parts, and most fixes only touch one of them. Nine versions of the same page, measured in real Chromium, show which fixes help, which do nothing, and why preloading a client-rendered hero barely helps.
tags: ["frontend", "performance", "core-web-vitals", "lcp", "browser"]
cover: /blog-images/lcp-what-actually-moves-it/cover.png
---

A page can feel slow before anyone clicks anything. The header shows up, then a grey box sits where the big product photo should be, and the photo arrives a second or two later. **Largest Contentful Paint (LCP)** is the metric that measures that wait. It is one of Google's three Core Web Vitals, next to [Interaction to Next Paint](/blog/interaction-to-next-paint-inp-fix-slow-clicks) for clicks.

There is a lot of LCP advice around: preload the hero image, add `fetchpriority="high"`, never lazy-load it, render on the server. These tips are all reasonable, but each one fixes a different part of the wait. Apply one to the wrong part and nothing changes.

To see which fix moves which part, I built one test page in nine versions and loaded each in real Chromium seven times. Every number in this post comes from those runs, and the method section says exactly how they were made.

## What LCP measures

> **Short answer:** LCP is the time from when the user starts loading the page until the largest image or text block in the viewport is drawn. Good is 2.5 seconds or less at the 75th percentile of real visits.

The **viewport** is the part of the page you can see without scrolling. As the page loads, the browser keeps track of the biggest element drawn so far in it. Each time a bigger one appears, it records a new candidate. The last candidate before the user interacts is the page's LCP.

According to [web.dev](https://web.dev/articles/lcp), the elements that count are `<img>` elements, `<image>` elements inside an SVG, `<video>` (its poster image or first frame), elements with a CSS `background-image` loaded with `url()`, and block-level elements that contain text. Chromium also ignores some elements on purpose: "Elements with an opacity of 0", "Elements that cover the full viewport", and "Placeholder images or other images with a low entropy".

The target, from the same page: sites "should strive to have Largest Contentful Paint of 2.5 seconds or less", measured at "the 75th percentile of page loads, segmented across mobile and desktop devices". The **75th percentile** is the value that three out of four visits beat. The page's rating chart puts "poor" above 4.0 seconds.

On most pages the LCP element is an image: a hero banner, a product photo, an article's lead picture. The rest of this post is about that case.

## The four parts of LCP

> **Short answer:** an image LCP splits into time to first byte, resource load delay, resource load duration and element render delay. Each fix shortens exactly one of them, so measure which one is big before choosing a fix.

[web.dev's guide to optimizing LCP](https://web.dev/articles/optimize-lcp) splits the time into four **subparts**:

| Subpart | From | To |
| :--- | :--- | :--- |
| **Time to first byte (TTFB)** | The user starts loading the page | The first byte of the HTML arrives |
| **Resource load delay** | TTFB | The browser starts downloading the LCP image |
| **Resource load duration** | Download starts | Download finishes |
| **Element render delay** | Download finishes | The image is drawn on screen |

![LCP as one bar split into four parts: time to first byte, resource load delay, resource load duration and element render delay, with the part each fix shortens](/blog-images/lcp-what-actually-moves-it/subparts.svg)

The same guide suggests a rough target split for a well-optimized page: about 40% TTFB, under 10% load delay, about 40% load duration and under 10% render delay. In other words, nearly all the time should go to two things you cannot avoid: getting the HTML and downloading the image. The guide calls these "guidelines, not strict rules".

Real sites look different. In a [2024 analysis of Chrome field data](https://web.dev/blog/common-misconceptions-lcp), the Chrome team found that "image download time is almost never the bottleneck". For origins with poor LCP, the median p75 values were 2,270 ms of TTFB, 1,290 ms of load delay, only 350 ms of load duration and 360 ms of render delay. In their words, the median poor site "spends almost four times as long waiting to start downloading the LCP image as it does actually downloading it."

That is worth remembering in an interview. Compressing the image only shortens load duration, which is usually the smallest part. The big wins are usually in the waiting.

## How the experiment works

> **Short answer:** one page with a 157 KB hero image, nine ways of loading that image, a server that simulates a slow shared connection, Chromium 141, seven runs each, median reported.

The test page has a row of small images at the top, a 1200×600 hero image, a short paragraph, a stylesheet and a 150 KB deferred script (`app.js`) standing in for a JavaScript bundle. The viewport is 1280×800, so the hero is the largest thing on screen.

To make loading slow enough to measure, the server shares one simulated connection between all responses: 16 KB every 80 ms (about 200 KB/s, or 1.6 Mbps), plus 150 ms before each response starts. It speaks HTTP/2 over TLS.

The server also decides **which response gets the bandwidth first**, and this turned out to matter a lot. Chromium 141 sends a `priority` header with each HTTP/2 request ([RFC 9218](https://www.rfc-editor.org/rfc/rfc9218) urgency, where `u=0` is most urgent). I logged it from a small probe server (other fields trimmed):

```text
/ priority hdr= u=0, i
/b.jpg priority hdr= u=1, i
/a.jpg priority hdr= u=2, i
/c.js priority hdr= u=2
```

Here `b.jpg` had `fetchpriority="high"` and `a.jpg` did not. The main test server sends the most urgent waiting response first and lets responses of equal urgency take turns, the way a priority-aware CDN behaves. For comparison, I also ran a "fair" mode that ignores priority and gives every response an equal share.

For each run I recorded the priority Chromium gave the hero (through the DevTools protocol), the final LCP entry, and the four subparts, computed from the page's own timing APIs:

```javascript
// Runs in the page. This is the code the test injected.
new PerformanceObserver((list) => {
  const lcp = list.getEntries().at(-1);
  const nav = performance.getEntriesByType("navigation")[0];
  const res = performance.getEntriesByName(lcp.url)[0];
  const ttfb = nav.responseStart;
  const loadStart = Math.max(ttfb, res.requestStart || res.startTime);
  const loadEnd = Math.max(loadStart, res.responseEnd);
  console.log({
    lcp: lcp.startTime,
    ttfb,
    loadDelay: loadStart - ttfb,
    loadDuration: loadEnd - loadStart,
    renderDelay: lcp.startTime - loadEnd,
  });
}).observe({ type: "largest-contentful-paint", buffered: true });
```

One note on method: I first tried Chrome DevTools network throttling instead of a slow server. In that setup, headless Chromium never reported the hero as an LCP candidate. It reported a small thumbnail instead, while the same page without throttling reported the hero. I did not track down why, so I moved the throttling into the server, where the hero was reported every time. If your lab tool names a strange LCP element, check what it is measuring before you trust the number.

## The results

> **Short answer:** a plain `<img>` in the HTML loaded in about 1.26 s. Lazy loading, a CSS background or a JavaScript-inserted image each cost 1.4 to 1.5 s more. `fetchpriority="high"` saved 2 s in one case and nothing in another.

Medians of seven runs on the priority-aware server. "First priority" is the priority Chromium gave the hero when it requested it; an arrow shows a later change.

| # | Setup | First priority | LCP | Biggest subpart |
| :--- | :--- | :--- | ---: | :--- |
| 1 | `<img>` in the HTML | Medium → High | 1,256 ms | load duration 960 ms |
| 2 | Same, plus `fetchpriority="high"` | High | 1,260 ms | load duration 961 ms |
| 3 | `<img loading="lazy">` | Low → High | 2,696 ms | load duration 2,242 ms |
| 4 | CSS `background-image` | Low → High | 2,700 ms | load duration 2,246 ms |
| 5 | CSS background plus `<link rel="preload">` | High | 1,256 ms | load duration 963 ms |
| 6 | `<img>` inserted by JavaScript | Low → High | 2,784 ms | load delay 1,631 ms |
| 7 | JavaScript `<img>` plus `<link rel="preload">` | High | 2,700 ms | render delay 1,463 ms |
| 8 | Hero is the sixth large image | Low → High | 3,256 ms | load duration 2,964 ms |
| 9 | Same, plus `fetchpriority="high"` | High | 1,260 ms | load duration 959 ms |

![Bar chart of median LCP for the nine setups: the plain img, the preloaded background and the sixth image with fetchpriority all finish near 1.26 seconds, while lazy, background, JavaScript-inserted, preloaded JavaScript and the sixth image without priority take 2.7 to 3.3 seconds](/blog-images/lcp-what-actually-moves-it/results.svg)

Runs were very stable. For example, the seven runs of setup 1 ranged from 1,248 to 1,316 ms and setup 8 from 3,244 to 3,288 ms.

One limitation affects the Low → High rows. Chromium raises an image's priority once layout shows it is in the viewport, but my server only reads the urgency a request arrives with and ignores later changes. A server that applied the later boost would shrink the gap for setups 3, 4, 6 and 8. It would not remove the load delay, which happens before the request is even sent.

The sections below take the setups in groups.

## Let the browser find the image early

> **Short answer:** the browser can only start downloading an image once it knows the URL. An `<img>` in the HTML is found almost immediately; a CSS background or a JavaScript-inserted image is found much later.

Browsers have a **preload scanner**: a second, lightweight parser that reads ahead through the raw HTML and starts downloading images, scripts and stylesheets before the main parser reaches them. It only sees what is literally in the HTML. It cannot see an image named in a CSS file or one that JavaScript will add later.

![Three timelines showing when the hero image URL is discovered: straight from the HTML, after the CSS has loaded and styles are applied, or only after the JavaScript bundle has downloaded and run](/blog-images/lcp-what-actually-moves-it/discovery.svg)

The load delay column shows this directly:

| Setup | How the URL is found | Resource load delay |
| :--- | :--- | ---: |
| `<img>` in the HTML | Preload scanner reads it | 17 ms |
| CSS `background-image` | After the CSS loads and the element is styled | 185 ms |
| `loading="lazy"` | After layout shows it is in the viewport | 187 ms |
| `<img>` inserted by JavaScript | After `app.js` downloads and runs | 1,631 ms |

The CSS in this test was tiny and arrived quickly. On a real site with a large stylesheet, the CSS background delay would grow with it; that is an inference from how discovery works, not something this test measured.

The bigger cost for setups 3, 4 and 6 was priority. All three started at **Low**, so on a priority-aware server their bytes waited behind everything more urgent. That is why their load duration grew to more than 2.2 s even though the image itself did not change.

The lazy case is the easiest to avoid. web.dev's guide says it in five words: "Never lazy-load your LCP image." `loading="lazy"` is meant for images below the fold.

**Fix for a CSS background:** preload it. Setup 5 added one line to the `<head>`, and LCP went from 2,700 ms back to 1,256 ms, the same as a plain `<img>`:

```html
<link rel="preload" as="image" href="/hero.jpg" fetchpriority="high">
```

## `fetchpriority="high"`: a big win or no change at all

> **Short answer:** it helps when the browser would otherwise guess a low priority for your hero, and when the server honors priorities. In this test it saved 2 seconds in one setup and nothing in another.

[web.dev's Fetch Priority article](https://web.dev/articles/fetch-priority) explains how Chrome picks image priorities: "Images start at "Low" priority by default. At layout time, images within the viewport are boosted to "High"." It adds: "As of Chrome 117, the first 5 large images are set to "Medium" to speed this up."

The test matched that exactly:

- In setup 1, the small thumbnails above the hero did not count as large, so the hero was among the first five large images. It started at **Medium**, and `fetchpriority="high"` (setup 2) changed nothing: 1,256 ms against 1,260 ms.
- In setup 8, I replaced the thumbnails with five larger card images. Now the hero was the **sixth** large image, so it started at **Low** and LCP rose to 3,256 ms. Adding `fetchpriority="high"` (setup 9) brought it back to 1,260 ms.

![Two request queues: without the attribute the hero waits at Low priority behind five Medium card images; with fetchpriority high it is sent first](/blog-images/lcp-what-actually-moves-it/priority.svg)

Then I ran setups 8 and 9 again with the server in fair mode, ignoring priority:

| Setup | Priority-aware server | Fair server |
| :--- | ---: | ---: |
| Sixth image, no attribute | 3,256 ms | 3,256 ms |
| Sixth image, `fetchpriority="high"` | 1,260 ms | 3,172 ms |

On the fair server, the attribute saved 84 ms instead of 2 seconds. The browser still sent the hero as High, but the server shared the bandwidth equally anyway. web.dev calls the attribute "a hint, not a directive", and this shows why: the hint only pays off if something along the way acts on it. Whether your CDN or server acts on it is something to test, not assume.

Do not put it on everything, either. The optimize-LCP guide warns that "setting a high priority on more than one or two images makes priority setting unhelpful in reducing LCP." If everything is urgent, nothing is.

## The preload trap with client-side rendering

> **Short answer:** preloading a client-rendered hero gets the bytes early, but the image still cannot appear until JavaScript creates the `<img>`. The time moves from load delay to render delay, and LCP barely changes.

This was the most useful result in the test. In setup 6, a single-page-app style page, the hero `<img>` only exists after `app.js` downloads and runs. LCP was 2,784 ms, mostly load delay.

The common advice is to preload the image. Setup 7 did that. The image now downloaded right away, and was fully loaded by about 1.23 s. LCP was still 2,700 ms:

![Timeline of the preloaded client-rendered page: the hero finishes downloading at about 1.2 seconds, then waits about 1.5 seconds for the JavaScript bundle to run and create the img element before it can be painted](/blog-images/lcp-what-actually-moves-it/preload-trap.svg)

The subparts show what happened. Here is one real run of each page, broken down with the same arithmetic the test used:

```javascript-run
// Timestamps in ms from one real Chromium run of each page.
const runs = {
  "img in HTML":            { ttfb: 272, loadStart: 282,  loadEnd: 1241, lcp: 1260 },
  "img added by JS":        { ttfb: 260, loadStart: 1946, loadEnd: 2824, lcp: 2840 },
  "JS img + preload":       { ttfb: 258, loadStart: 273,  loadEnd: 1234, lcp: 2700 },
  "6th image, no priority": { ttfb: 256, loadStart: 284,  loadEnd: 3245, lcp: 3256 },
};

function breakdown({ ttfb, loadStart, loadEnd, lcp }) {
  return {
    ttfb,
    loadDelay: loadStart - ttfb,
    loadDuration: loadEnd - loadStart,
    renderDelay: lcp - loadEnd,
  };
}

const pct = (part, total) => Math.round((part / total) * 100) + "%";

for (const [name, run] of Object.entries(runs)) {
  const b = breakdown(run);
  const parts = Object.entries(b).map(([k, ms]) => `${k} ${ms} (${pct(ms, run.lcp)})`);
  console.log(`${name}: LCP ${run.lcp} ms`);
  console.log("  " + parts.join(", "));
  const [worst] = Object.entries(b).sort((x, y) => y[1] - x[1]);
  console.log(`  biggest: ${worst[0]}`);
}
```

Output:

```text
img in HTML: LCP 1260 ms
  ttfb 272 (22%), loadDelay 10 (1%), loadDuration 959 (76%), renderDelay 19 (2%)
  biggest: loadDuration
img added by JS: LCP 2840 ms
  ttfb 260 (9%), loadDelay 1686 (59%), loadDuration 878 (31%), renderDelay 16 (1%)
  biggest: loadDelay
JS img + preload: LCP 2700 ms
  ttfb 258 (10%), loadDelay 15 (1%), loadDuration 961 (36%), renderDelay 1466 (54%)
  biggest: renderDelay
6th image, no priority: LCP 3256 ms
  ttfb 256 (8%), loadDelay 28 (1%), loadDuration 2961 (91%), renderDelay 11 (0%)
  biggest: loadDuration
```

The preload moved 1.67 s out of load delay and almost all of it reappeared as render delay. The page was still waiting for the same thing: the JavaScript bundle. Only 84 to 140 ms was saved, depending on which numbers you compare.

The fix is to put the `<img>` in the HTML the server sends, with server-side rendering, static generation, or a small server-rendered shell that already contains the hero. Then the preload scanner finds it and nothing has to wait for the bundle. Any of these works, as long as the image tag is in the first HTML response.

This is also why you should measure subparts before choosing a fix. Total LCP alone would have told you "preload did nothing" without telling you why.

## Measure the subparts on real users

> **Short answer:** use the attribution build of the `web-vitals` library. It reports the four subparts and the LCP element for each real visit.

Lab tests like this one tell you what *can* happen. Field data tells you what *does* happen on your users' phones and networks. The [`web-vitals`](https://github.com/GoogleChrome/web-vitals) library (version 6.2.3 at the time of writing) has an attribution build that computes the subparts for you:

```javascript
import { onLCP } from "web-vitals/attribution";

onLCP(({ value, attribution }) => {
  sendToAnalytics({
    lcp: value,
    element: attribution.target,
    url: attribution.url,
    ttfb: attribution.timeToFirstByte,
    loadDelay: attribution.resourceLoadDelay,
    loadDuration: attribution.resourceLoadDuration,
    renderDelay: attribution.elementRenderDelay,
  });
});
```

`sendToAnalytics` stands for whatever you use to collect data. I ran this code (logging instead of sending) on the test page for setup 7. It named `#root>img.hero` as the LCP element and reported a render delay of 1,463 ms, the same pattern as the table above. Its total LCP was higher than in the main runs because the library's own module files were competing for the same slow connection, so compare subparts rather than totals when you add measurement code to a lab test.

Once you have subparts per visit, look at the 75th percentile of each one. Whichever is largest is the one to fix first.

## Which fix for which subpart

> **Short answer:** TTFB is a server and caching problem, load delay is a discovery and priority problem, load duration is an image size and contention problem, and render delay is usually JavaScript.

| Biggest subpart | Typical causes | Fixes |
| :--- | :--- | :--- |
| **TTFB** | Slow server code, no CDN, redirects, no HTML caching | Cache HTML at the edge, remove redirects, speed up the backend |
| **Load delay** | Image in CSS or JavaScript, `loading="lazy"`, Low priority | Put `<img>` in the HTML, preload backgrounds, remove `loading="lazy"`, add `fetchpriority="high"` |
| **Load duration** | Large file, many other downloads competing | Modern formats (AVIF, WebP), right-sized `srcset`, fewer competing requests, `fetchpriority="high"` |
| **Render delay** | `<img>` created by JavaScript, render-blocking scripts or CSS, hidden until a script runs | Render the hero on the server, reduce blocking resources, avoid hiding content until hydration |

Notice that load duration in this test was driven by competition more than file size: the same 157 KB image took 960 ms when it had priority and 2,964 ms when it did not.

## Questions interviewers ask about LCP

**"What is a good LCP?"**
2.5 seconds or less at the 75th percentile of real visits, measured separately for mobile and desktop. Above 4 seconds is poor.

**"Our LCP is bad. Where do you start?"**
Find the LCP element and break the time into the four subparts, in the field if possible. Then fix the largest subpart. Do not start by compressing the image; Chrome's field data shows download time is usually the smallest part.

**"Should I preload the LCP image?"**
Only if the browser cannot find it in the HTML, for example a CSS background. If the `<img>` is already in the HTML, preloading adds little. If the image is rendered by JavaScript, a preload moves the wait from load delay to render delay; the real fix is to send the `<img>` in the HTML.

**"What does `fetchpriority="high"` actually do?"**
It tells the browser to request the image at High priority instead of guessing. It matters most when the hero is not among the first five large images, which start at Medium in Chrome. It only shortens the download if the server or CDN honors request priority.

**"Why not lazy-load everything?"**
A lazy image is only requested after layout, at Low priority. For the LCP image that is the worst combination: in this test it cost about 1.4 seconds. Lazy-load images below the fold only.

**"Can text be the LCP element?"**
Yes, any block-level element with text can be. Then the usual cause of slow LCP is TTFB, render-blocking CSS, or web fonts that keep text invisible while they load.

## Cheat sheet

| Situation | What it costs | Fix |
| :--- | :--- | :--- |
| `<img>` in the HTML, among first five large images | Nothing extra (1,256 ms here) | Leave it |
| Hero is the sixth or later large image | Starts at Low (3,256 ms here) | `fetchpriority="high"` (1,260 ms here) |
| `loading="lazy"` on the hero | Late request, Low priority (2,696 ms) | Remove it |
| Hero as CSS `background-image` | Found after CSS, Low priority (2,700 ms) | `<link rel="preload" as="image" fetchpriority="high">` (1,256 ms) |
| Hero `<img>` created by JavaScript | Waits for the bundle (2,784 ms) | Server-render the `<img>` |
| Same, with preload | Wait moves to render delay (2,700 ms) | Still: server-render the `<img>` |
| Server ignores priority | `fetchpriority` saves little (84 ms here) | Use a CDN or server that prioritizes |
| Field diagnosis | | `onLCP` from `web-vitals/attribution`, fix the largest subpart at p75 |

The pattern to remember: LCP is four waits in a row, and every fix shortens exactly one of them. Measure which wait is long, then pick the fix for that one.
