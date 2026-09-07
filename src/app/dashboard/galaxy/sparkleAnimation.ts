/**
 * Hand-crafted Milky Way sparkle: a gold star that breathes, a cyan moonlet
 * orbiting it, and a shooting star crossing every loop. Pure lottie shape
 * layers (no raster assets) so it stays crisp at any size.
 */
export const STAR_LOTTIE = {
  v: "5.5.7",
  fr: 60,
  ip: 0,
  op: 150,
  w: 200,
  h: 200,
  nm: "Milky Way Sparkle",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Sparkle",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [20] },
            { t: 38, s: [100] },
            { t: 112, s: [100] },
            { t: 149, s: [20] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 104, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [62, 62, 100] },
            { t: 38, s: [104, 104, 100] },
            { t: 75, s: [92, 92, 100] },
            { t: 112, s: [104, 104, 100] },
            { t: 149, s: [62, 62, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "gr",
          nm: "Star",
          it: [
            {
              ty: "sh",
              nm: "Path",
              ks: {
                a: 0,
                k: {
                  i: [
                    [0, 0], [0, 0], [0, 0], [0, 0],
                    [0, 0], [0, 0], [0, 0], [0, 0],
                  ],
                  o: [
                    [0, 0], [0, 0], [0, 0], [0, 0],
                    [0, 0], [0, 0], [0, 0], [0, 0],
                  ],
                  v: [
                    [0, -36], [8, -8], [36, 0], [8, 8],
                    [0, 36], [-8, 8], [-36, 0], [-8, -8],
                  ],
                  c: true,
                },
              },
            },
            { ty: "fl", nm: "Fill", c: { a: 0, k: [1, 0.82, 0.4, 1] }, o: { a: 0, k: 100 } },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Moonlet",
      sr: 1,
      ks: {
        o: { a: 0, k: 90 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [170, 104, 0], e: [100, 130, 0] },
            { t: 37, s: [100, 130, 0], e: [30, 104, 0] },
            { t: 75, s: [30, 104, 0], e: [100, 78, 0] },
            { t: 112, s: [100, 78, 0], e: [170, 104, 0] },
            { t: 149, s: [170, 104, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: "gr",
          nm: "Dot",
          it: [
            {
              ty: "el",
              nm: "Ellipse",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [13, 13] },
            },
            { ty: "fl", nm: "Fill", c: { a: 0, k: [0.13, 0.83, 0.93, 1] }, o: { a: 0, k: 100 } },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Shooter",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: 88, s: [0] },
            { t: 100, s: [100] },
            { t: 128, s: [100] },
            { t: 140, s: [0] },
            { t: 149, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 88, s: [186, 8, 0], e: [14, 148, 0] },
            { t: 140, s: [14, 148, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: "gr",
          nm: "Head",
          it: [
            {
              ty: "el",
              nm: "Ellipse",
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [11, 11] },
            },
            { ty: "fl", nm: "Fill", c: { a: 0, k: [1, 1, 1, 1] }, o: { a: 0, k: 100 } },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 150,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
} as const;
