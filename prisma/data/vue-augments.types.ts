/**
 * Shapes for Vue question augments (technology='vuejs').
 *
 * Answers are markdown (may embed inline <svg class="iq-diagram"> + GFM tables).
 * A runnable example (tech "vue", `runnable` not false) must be a SELF-CONTAINED
 * Single File Component: the playground hand-off replaces /src/App.vue in the
 * Sandpack `vue` template (createApp(App).mount("#app"), no plugins), and the
 * bundler resolves vue ^3.2.45 to the latest 3.x. So it may import only from
 * "vue" and must not need app.use(...) (Pinia, Vue Router) or other files;
 * anything else is `runnable: false` (static highlighted code, no Run button).
 * Check runnable code with scripts/verify-vue-example.mjs.
 */
export type VueVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type VueExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: VueVariant[];
};

export type VueAugment = {
  title: string;
  answer?: string;
  /** Question Body (CLAUDE.md §6). Renders WITHOUT rehype-raw: plain markdown only, no HTML/SVG. */
  description?: string;
  /** One plain sentence, <=155 chars, used as the page meta description. */
  seoDescription?: string;
  examples?: VueExample[];
  /** Optional corrected difficulty ("easy" | "medium" | "hard"). */
  difficulty?: "easy" | "medium" | "hard";
};
