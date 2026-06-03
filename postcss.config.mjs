export default {
  plugins: {
    tailwindcss: {},
    // Convert literal px FONT SIZES in the compiled CSS to rem so they scale
    // with the root font-size (see --base-font-size in globals.css). This
    // rem-ifies the ~1,900 `text-[Npx]` utilities app-wide without editing a
    // single class. Scoped to `font-size` only — paddings/margins/borders stay
    // px so layout geometry is unchanged; only type fluidly resizes.
    "postcss-pxtorem": {
      rootValue: 16,
      unitPrecision: 5,
      propList: ["font-size"],
      // Tiny values (1px hairlines etc.) aren't font sizes worth converting.
      minPixelValue: 2,
      mediaQuery: false,
      exclude: /node_modules/i,
    },
    autoprefixer: {},
  },
};
