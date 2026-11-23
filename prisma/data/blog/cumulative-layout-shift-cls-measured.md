---
slug: cumulative-layout-shift-cls-measured
title: "Cumulative Layout Shift (CLS), Measured: 15 Test Pages That Show What Moves the Score"
excerpt: What CLS actually counts, how one shift is scored, why two shifts are not added together, and which fixes work. Every number comes from real layout-shift entries recorded in Chromium, covering images, ads, cookie bars, web fonts, animations and clicks.
tags: ["frontend", "performance", "core-web-vitals", "css"]
cover: /blog-images/cumulative-layout-shift-cls-measured/cover.png
---

You start reading an article, an ad loads above the paragraph, and the text jumps down. You go to tap "Cancel", a cookie bar appears, and you tap "Buy" instead. That jump is a **layout shift**, and **Cumulative Layout Shift (CLS)** is the Core Web Vital that measures how much of it a page does.

CLS is easy to get wrong in both directions. Teams chase shifts that do not count, and they miss shifts that do. To see what actually moves the score, I built 15 small test pages, loaded each one in Chromium 153 through Playwright with a 390×844 phone-sized viewport, and recorded every `layout-shift` entry the browser reported. Each page was run at least twice and gave the same scores each time (an animated page varied in the fourth decimal place).

The definitions in this post come from web.dev's [CLS article](https://web.dev/articles/cls) and its [guide to optimizing CLS](https://web.dev/articles/optimize-cls). The numbers come from my own runs.

## What counts as good

> CLS should be 0.1 or less, measured at the 75th percentile of page loads. Above 0.25 is poor.

web.dev's article puts it this way: "sites should strive to have a CLS score of 0.1 or less", judged at "the 75th percentile of page loads, segmented across mobile and desktop devices." Values from 0.1 to 0.25 "need improvement", and "Poor values are greater than 0.25."

CLS has no unit. It is not pixels or milliseconds. It is a score built from how much of the screen moved and how far it moved.

## How one shift is scored

> A shift's score is the share of the viewport that moved, multiplied by how far it moved as a share of the viewport.

The browser reports a layout shift when a visible element changes its **start position** (its top-left corner) between two frames. Such an element is called an **unstable element**. Two details matter:

- An element that appears for the first time, or changes size without moving, is not itself a shift. web.dev: "If a new element is added to the DOM or an existing element changes size, it doesn't count as a layout shift". What counts is the content around it that gets pushed.
- The score of one shift is `impact fraction × distance fraction`.
  - The **impact fraction** is the area covered by all unstable elements, in the frame before and the frame after, as a fraction of the viewport.
  - The **distance fraction** is the largest distance any unstable element moved, divided by the viewport's larger dimension, which is the height on a phone.

Here is the ad test page. One second after load, a script puts a 250px ad below the heading. Everything under the heading moves down 250px.

![An ad inserted below the heading pushes the text down 250px. The moved text covers 86.8% of the viewport and moved 250 of 844 pixels, so the shift scores 0.868 times 0.296, or 0.257.](/blog-images/cumulative-layout-shift-cls-measured/shift-score.svg)

Chromium reported a single shift of **0.2571**, which is poor on its own. The distance fraction is 250 / 844 = 0.296, so the impact fraction works out to 0.868: almost the whole screen was text that moved. The same 250px ad placed at the bottom of the article would push nothing visible and score close to zero. web.dev makes the same point: "Dynamically injected content closer to the top of the viewport usually causes greater layout shifts."

## How shifts add up: session windows

> CLS is the worst burst of shifts, not the total. A burst ends when there is a 1-second gap, and it can last at most 5 seconds.

Shifts are not simply added up for the whole visit. They are grouped into **session windows**: "one or more individual layout shifts occur in rapid succession with less than 1-second in between each shift and a maximum of 5 seconds for the total window duration." The page's CLS is the window with the highest total.

One test page inserts a 150px ad at 1 second and a second one at 4 seconds:

![Two ads three seconds apart form two separate session windows of 0.156 and 0.106. CLS is the larger window, 0.156, not the sum.](/blog-images/cumulative-layout-shift-cls-measured/session-windows.svg)

The shifts were 0.1562 and 0.1061. The sum is 0.2623, which would be poor. The CLS is **0.1562**, because the shifts are three seconds apart and form two windows. If the second ad had loaded 500 ms after the first, both would share a window and CLS would be about 0.26.

The opposite also happens. A CSS transition that animates an element's `height` produces a shift on every frame. On my test page, a notice growing from 0 to 120px over 300 ms produced **13 shifts**, each under 0.014. They were all less than 1 second apart, so they formed one window totalling **0.0985**, just under the "good" line from one small animation.

You can check both rules without a browser. This function implements session windows and runs on the shift values Chromium reported for three of the test pages, rounded to four decimal places:

```javascript-run
// CLS is the largest "session window" of layout shifts, not the sum of all of them.
// A window keeps growing while shifts are less than 1 s apart, up to 5 s in total.
function cls(shifts) {
  let worst = 0, current = 0, windowStart = 0, previous = -Infinity;
  for (const s of shifts) {
    if (s.hadRecentInput) continue; // within 500 ms of a tap, click or keypress
    const sameWindow = s.time - previous < 1000 && s.time - windowStart < 5000;
    if (sameWindow) {
      current += s.value;
    } else {
      current = s.value;
      windowStart = s.time;
    }
    previous = s.time;
    worst = Math.max(worst, current);
  }
  return worst;
}

const sum = (shifts) => shifts.reduce((t, s) => t + (s.hadRecentInput ? 0 : s.value), 0);
const show = (x) => x.toFixed(4);

// Shifts recorded in Chromium for three of the test pages in this post.
const pages = {
  "two ads, 3 s apart": [
    { time: 1017, value: 0.1562 },
    { time: 4018, value: 0.1061 },
  ],
  "notice animates its height": [0.0041, 0.0081, 0.012, 0.0138, 0.0132, 0.0113, 0.0092, 0.0074, 0.0059, 0.0047, 0.0037, 0.0029, 0.0023]
    .map((value, i) => ({ time: 1018 + i * 16.7, value })),
  "details open right after a click": [
    { time: 1583, value: 0.1822, hadRecentInput: true },
  ],
};

for (const [name, shifts] of Object.entries(pages)) {
  console.log(`${name}: ${shifts.length} shift(s), sum ${show(sum(shifts))}, CLS ${show(cls(shifts))}`);
}
```

Output:

```text
two ads, 3 s apart: 2 shift(s), sum 0.2623, CLS 0.1562
notice animates its height: 13 shift(s), sum 0.0986, CLS 0.0986
details open right after a click: 1 shift(s), sum 0.0000, CLS 0.0000
```

The animation's 0.0986 differs from the measured 0.0985 only because the inputs are rounded. The third page is explained in the section on user input below.

## The results

Every bad pattern had a fix that brought the page to exactly 0:

![Six test pages scored between 0.099 and 0.257 before their fix, and 0 after it.](/blog-images/cumulative-layout-shift-cls-measured/results.svg)

| Test page | CLS | Fixed version | CLS |
|---|---:|---|---:|
| `<img>` with no size, loads at 800 ms | 0.1390 | `width` and `height` attributes | 0 |
| | | CSS `aspect-ratio: 2 / 1` | 0 |
| 250px ad inserted at 1 s | 0.2571 | `min-height: 250px` on the slot | 0 |
| 120px cookie bar prepended at 1 s | 0.1422 | `position: fixed` at the bottom | 0 |
| web font swaps in at 800 ms | 0.1070 | fallback with `size-adjust: 125%` | 0 |
| | | `font-display: optional` | 0 |
| notice animates `height` | 0.0985 | notice slides in with `transform` | 0 |
| details open 700 ms after a click | 0.1822 | details open on the click itself | 0 |

The sections below explain each pair.

## Images and embeds: reserve the space

> Give every image, video and iframe a size before it loads: `width` and `height` attributes, or CSS `aspect-ratio`.

An `<img>` with no dimensions takes up no height until its file arrives. When the image loads, it grows to its real height and pushes everything below it down. On the test page, a 2:1 image that loaded at 800 ms caused one shift of **0.1390**.

```html
<!-- Shifts: the browser has no idea how tall this will be -->
<img src="/hero.png" style="width: 100%">

<!-- No shift: the browser computes the height from the ratio before the file arrives -->
<img src="/hero.png" width="1600" height="800" style="width: 100%; height: auto">

<!-- Also no shift -->
<img src="/hero.png" style="width: 100%; aspect-ratio: 2 / 1">
```

Both fixed versions measured **0**. The `width` and `height` attributes do not fix the displayed size. With `height: auto` in CSS, the browser uses them only for the ratio, so the image still scales to its container. web.dev gives the same advice: "Always include `width` and `height` size attributes on your images and video elements", or reserve the space with `aspect-ratio`.

Ads, embeds and iframes have the same problem, with the extra trouble that you often do not know their final size. Reserve the most likely size:

```css
.ad-slot { min-height: 250px; }
```

With the slot reserved, the ad test went from **0.2571** to **0**. If the real ad turns out taller than the reserved space, the extra height still shifts the content below, so size the slot for the most common ad you serve.

## Banners and late UI: overlay, do not insert

> Anything that appears after the first paint should sit on top of the content, not push it.

The cookie bar test prepends a 120px bar to `<body>` one second after load. Everything moves down 120px: **0.1422**. The same bar with `position: fixed; bottom: 0` covers part of the page without moving anything: **0**.

The same rule applies to "new version available" bars, promo strips and chat widgets. If something must be in the flow, reserve its space in the server-rendered HTML so it is there from the first paint.

## Web fonts: match the fallback, or skip the swap

> A font swap only shifts the layout if it changes where lines break. Make the fallback font take up the same space, or use `font-display: optional`.

With `font-display: swap`, the browser shows text in a **fallback font** (a font already on the device) and swaps in the web font when it arrives. That swap is a layout shift if the two fonts take up different amounts of space.

I first tried a web font whose text was about 6% wider than the fallback. It caused **no shift at all**. Every paragraph still broke into the same number of lines, and with a fixed `line-height` each line is the same height whatever the font. Text moved sideways inside its lines, but no element's start position changed.

Then I used a handwritten font whose text is about 25% wider than the fallback (Liberation Serif, the browser's default serif in my test environment). Every paragraph grew from five lines to six, from 135px to 162px, and everything below moved: **0.1070**.

![With the fallback font each paragraph has five lines. When the wider web font arrives each paragraph has six lines, so everything below moves. A fallback scaled with size-adjust to 125% has six lines from the start.](/blog-images/cumulative-layout-shift-cls-measured/font-swap.svg)

Each of the 10 paragraphs gained a line, which pushed every paragraph below it down. Two fixes measured **0**:

```css
/* Fix 1: make the fallback take up the same space as the web font */
@font-face {
  font-family: "Fallback";
  src: local("Liberation Serif");
  size-adjust: 125%;       /* the web font's text is 25% wider */
  ascent-override: 70.9%;  /* web font ascent / size-adjust */
  descent-override: 29.9%; /* web font descent / size-adjust */
  line-gap-override: 0%;
}
body { font-family: "Web", "Fallback", serif; }

/* Fix 2: only use the web font if it is ready in time for the first layout */
@font-face {
  font-family: "Web";
  src: url(/web.woff2) format("woff2");
  font-display: optional;
}
```

I found the `size-adjust` value by measuring: the same paragraph set in one line was 1,775px wide in the web font and 1,421px in Liberation Serif, a ratio of 1.249. The ascent and descent overrides are the web font's own metrics (886 and 374 units per 1,000) divided by 1.25. A fallback with `size-adjust: 100%` and the same page still shifted by 0.1070, so the size adjustment is what did the work.

`font-display: optional` avoids the shift differently. web.dev describes it like this: "the web font is only used if it is available by the time of initial layout." On my test page the font arrived at 800 ms, too late, so the page stayed in the fallback font for that visit (the paragraphs kept their fallback height). The trade-off is that a first-time visitor on a slow connection may never see your font on that page. Once the font is cached, later pages can use it.

Frameworks can do the `size-adjust` work for you. In Next.js, `next/font` has an [`adjustFontFallback`](https://nextjs.org/docs/app/api-reference/components/font#adjustfontfallback) option, on by default, that sets up "an automatic fallback font" to "reduce Cumulative Layout Shift". If you load fonts by hand, measure the way shown above and check the result with a `layout-shift` observer, like the one at the end of this post.

## Animations: transform does not shift anything

> Animate `transform`, never `top`, `margin`, `height` or `width`, for anything that moves other content.

The "Saved" notice test animates `height` from 0 to 120px. It pushes the article down a little on every frame: 13 shifts and **0.0985** CLS in total. The fixed version is a toast that slides in with `transform: translateY()` over the content: **0**.

The [optimize-CLS guide](https://web.dev/articles/optimize-cls) gives the reason: "Composited animations using `translate` can't impact other elements, and so don't count toward CLS." A transform moves how an element is painted, not where it sits in the layout, so nothing around it is pushed.

## User input: the 500 ms rule

> Shifts within 500 ms of a tap, click or keypress do not count. A shift that waits for a network response usually misses that window.

Users expect the page to change when they click something. web.dev: "Layout shifts that occur within 500 milliseconds of user input will have the `hadRecentInput` flag set, so they can be excluded from calculations." Only discrete input counts. Scrolling, dragging and pinch-zoom do not.

Two test pages have a "Show details" button that inserts a 200px panel above the article:

| Version | Shift | `hadRecentInput` | CLS |
|---|---:|---|---:|
| panel inserted in the click handler | 0.1822 | true | 0 |
| panel inserted after a 700 ms `fetch()` | 0.1822 | false | 0.1822 |

The shift is identical. The only difference is timing. The second page waits for the network, the panel lands more than 500 ms after the click, and the shift counts against the page. The fix is to respond within the click: open the panel right away with a skeleton or spinner at its final size, then fill it in when the data arrives.

## Measuring it yourself

> Observe `layout-shift` entries with `buffered: true`, skip the ones with `hadRecentInput`, and group them into session windows.

This is the observer I injected into every test page with Playwright's `addInitScript`:

```javascript
const shifts = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    shifts.push({
      value: entry.value,
      time: entry.startTime,
      hadRecentInput: entry.hadRecentInput,
      // which elements moved; useful for finding the cause
      sources: entry.sources.map((s) => s.node && (s.node.id || s.node.nodeName)),
    });
  }
}).observe({ type: "layout-shift", buffered: true });
```

`buffered: true` delivers shifts that happened before the observer was created. `entry.sources` lists the elements that moved, which is usually the fastest way to find the cause. Feed the entries to the `cls()` function above to get the page's score.

A lab run like this only covers page load and the interactions you script. Real users scroll, open menus and stay on the page for minutes, so the CLS reported from the field (for example in Chrome's user experience data or by the `web-vitals` library) can be higher than what you see locally. Pages restored from the back/forward cache start again at zero: web.dev says that in that case "its CLS value should be reset to zero since users experience this as a distinct page visit."

## Cheat sheet

| Cause | Measured CLS | Fix | Measured after |
|---|---:|---|---:|
| image with no size | 0.139 | `width`/`height` attributes or `aspect-ratio` | 0 |
| ad or embed injected near the top | 0.257 | `min-height` on the slot | 0 |
| banner inserted into the flow | 0.142 | `position: fixed` overlay | 0 |
| web font changes line breaks | 0.107 | `size-adjust` fallback, or `font-display: optional` | 0 |
| web font about 6% wider, same line breaks | 0 | nothing needed | 0 |
| animating `height` | 0.099 | animate `transform` | 0 |
| content inserted 700 ms after a click | 0.182 | update the UI within 500 ms of the input | 0 |
| two shifts 3 s apart | 0.156, not 0.262 | windows end after a 1 s gap | |

If you are working through the other Core Web Vitals, the posts on [what actually moves LCP](/blog/lcp-what-actually-moves-it) and [fixing slow clicks with INP](/blog/interaction-to-next-paint-inp-fix-slow-clicks) use the same kind of measured test pages.
