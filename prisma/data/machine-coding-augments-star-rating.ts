import type { MachineCodingAugment } from "./machine-coding-augments.types";

/**
 * Machine Coding tutorial — "Build a Star Rating component" (half-stars) in
 * React / Vue / Angular. Each bundle = tutorial (~~~ fences) + runnable files.
 * Backslash-free; literal ★; Angular avoids optional chaining (?.) for the
 * Sandpack toolchain and uses escaped backticks for the inline template.
 */
const augments: MachineCodingAugment[] = [
  {
    title: "Build a Star Rating component",
    frameworks: {
      // ─────────────────────────── React ───────────────────────────
      react: {
        answer: `A **star rating** tests four things at once: separating **hover preview from the committed value**, the **half-star geometry**, **partial-fill rendering**, and a clean **controlled, accessible component**.

### The mental model

Keep **two** numbers: \`value\` (committed, set on click) and \`hover\` (transient preview). Render from **\`hover || value\`** — that one rule avoids the flicker bugs.

~~~jsx
const [value, setValue] = useState(0);
const [hover, setHover] = useState(0);
const active = hover || value;
~~~

### Step 1 — Half-star geometry

Compare the pointer X against the star's box: left half → \`x.5\`, right half → whole.

~~~jsx
function ratingFromEvent(e, i) {
  if (precision === 1) return i + 1;
  const rect = e.currentTarget.getBoundingClientRect();
  const isLeftHalf = e.clientX - rect.left < rect.width / 2;
  return i + (isLeftHalf ? 0.5 : 1);
}
~~~

### Step 2 — Rendering a partial star

Stack two stars — a gray one and a gold one clipped to the fill fraction.

~~~jsx
const fill = Math.max(0, Math.min(1, active - i)); // 0, 0.5 or 1 per star
<span style={{ position: 'relative' }}>
  <span style={{ color: '#d4d4dc' }}>★</span>
  <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: fill * 100 + '%', color: '#f5b50a' }}>★</span>
</span>
~~~

### Step 3 — Controlled + a11y

Accept \`value\`/\`onChange\` (fall back to internal state), a \`readOnly\` display mode, and make the group a \`radiogroup\` with arrow-key support.

**Interview tip:** lead with the **two-state model** and the **half-star math**; the **two-stacked-stars + clipped width** fill trick and **controlled radiogroup** are the senior signals.`,
        files: {
          "/src/StarRating.js": `import { useState } from 'react';

export default function StarRating({ count = 5, value: controlledValue, defaultValue = 0, precision = 0.5, readOnly = false, size = 36, onChange }) {
  const [internal, setInternal] = useState(defaultValue);
  const [hover, setHover] = useState(0);

  const value = controlledValue != null ? controlledValue : internal;
  const active = hover || value;

  function ratingFromEvent(e, i) {
    if (precision === 1) return i + 1;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    return i + (isLeftHalf ? 0.5 : 1);
  }

  function commit(next) {
    if (readOnly) return;
    if (controlledValue == null) setInternal(next);
    if (onChange) onChange(next);
  }

  function onKeyDown(e) {
    if (readOnly) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commit(Math.min(count, value + precision)); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commit(Math.max(0, value - precision)); }
    else if (e.key === 'Home') commit(0);
    else if (e.key === 'End') commit(count);
  }

  return (
    <div role="radiogroup" aria-label="Rating" aria-valuenow={value} aria-valuetext={value + ' of ' + count}
      tabIndex={readOnly ? -1 : 0} onKeyDown={onKeyDown} onMouseLeave={() => setHover(0)}
      style={{ display: 'inline-flex', gap: 4, outline: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const fill = Math.max(0, Math.min(1, active - i));
        return (
          <span key={i}
            onMouseMove={readOnly ? undefined : (e) => setHover(ratingFromEvent(e, i))}
            onClick={readOnly ? undefined : (e) => commit(ratingFromEvent(e, i))}
            style={{ position: 'relative', display: 'inline-block', width: size, height: size, fontSize: size, lineHeight: size + 'px', cursor: readOnly ? 'default' : 'pointer', userSelect: 'none' }}>
            <span style={{ color: '#d4d4dc' }}>★</span>
            <span style={{ position: 'absolute', left: 0, top: 0, width: fill * 100 + '%', overflow: 'hidden', color: '#f5b50a' }}>★</span>
          </span>
        );
      })}
    </div>
  );
}`,
          "/App.js": `import { useState } from 'react';
import StarRating from './src/StarRating';

export default function App() {
  const [rating, setRating] = useState(2.5);
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, textAlign: 'center' }}>
      <h2 style={{ marginBottom: 4 }}>Rate your experience</h2>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 16 }}>Hover the left vs right half of a star. Arrow keys work too.</p>
      <StarRating value={rating} precision={0.5} onChange={setRating} />
      <p style={{ marginTop: 18, fontSize: 18 }}>You rated: <strong>{rating}</strong> / 5</p>
      <hr style={{ margin: '24px auto', maxWidth: 240, border: 'none', borderTop: '1px solid #e5e5ea' }} />
      <p style={{ color: '#666', marginBottom: 6 }}>Read-only display (3.5):</p>
      <StarRating value={3.5} readOnly size={24} />
    </div>
  );
}`,
        },
      },

      // ─────────────────────────── Vue ───────────────────────────
      vue: {
        answer: `In Vue 3 the star rating keeps the same idea: a **transient \`hover\`** ref plus the **committed value** (here via \`v-model\`), and you render from a computed **\`hover || value\`**.

### The mental model

~~~html
<script setup>
import { ref, computed } from 'vue';
const hover = ref(0);
const active = computed(() => hover.value || props.modelValue);
</script>
~~~

### Step 1 — Half-star geometry

Same pointer math — measure the star and compare X to its midpoint.

~~~html
function ratingFromEvent(e, i) {
  if (props.precision === 1) return i + 1;
  const rect = e.currentTarget.getBoundingClientRect();
  const isLeft = e.clientX - rect.left < rect.width / 2;
  return i + (isLeft ? 0.5 : 1);
}
~~~

### Step 2 — Partial fill + v-model

Render \`v-for="i in count"\` with two stacked stars, the gold one's width bound to the fill fraction. Commit with \`emit('update:modelValue', …)\` so the parent can use \`v-model\`.

~~~html
<span class="star" @mousemove="onMove($event, i - 1)" @click="onClick($event, i - 1)">
  <span class="empty">★</span>
  <span class="fill" :style="{ width: fillFor(i - 1) * 100 + '%' }">★</span>
</span>
~~~

**Interview tip:** the Vue-specific bits are the **computed \`hover || value\`**, **\`v-model\`** via \`update:modelValue\`, and \`@mouseleave\` on the container to reset the preview. The geometry is identical to any framework.`,
        files: {
          "/src/components/StarRating.vue": `<template>
  <div class="rating" role="radiogroup" aria-label="Rating"
       :tabindex="readonly ? -1 : 0" @mouseleave="hover = 0" @keydown="onKeyDown">
    <span
      v-for="i in count"
      :key="i"
      class="star"
      :style="{ width: size + 'px', height: size + 'px', fontSize: size + 'px', lineHeight: size + 'px', cursor: readonly ? 'default' : 'pointer' }"
      @mousemove="onMove($event, i - 1)"
      @click="onClick($event, i - 1)"
    >
      <span class="empty">★</span>
      <span class="fill" :style="{ width: fillFor(i - 1) * 100 + '%' }">★</span>
    </span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  count: { type: Number, default: 5 },
  modelValue: { type: Number, default: 0 },
  precision: { type: Number, default: 0.5 },
  readonly: { type: Boolean, default: false },
  size: { type: Number, default: 36 },
});
const emit = defineEmits(['update:modelValue']);

const hover = ref(0);
const active = computed(() => hover.value || props.modelValue);

function fillFor(i) {
  return Math.max(0, Math.min(1, active.value - i));
}

function ratingFromEvent(e, i) {
  if (props.precision === 1) return i + 1;
  const rect = e.currentTarget.getBoundingClientRect();
  const isLeft = e.clientX - rect.left < rect.width / 2;
  return i + (isLeft ? 0.5 : 1);
}

function onMove(e, i) {
  if (!props.readonly) hover.value = ratingFromEvent(e, i);
}
function onClick(e, i) {
  if (!props.readonly) emit('update:modelValue', ratingFromEvent(e, i));
}
function onKeyDown(e) {
  if (props.readonly) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); emit('update:modelValue', Math.min(props.count, props.modelValue + props.precision)); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); emit('update:modelValue', Math.max(0, props.modelValue - props.precision)); }
}
</script>

<style scoped>
.rating { display: inline-flex; gap: 4px; outline: none; }
.star { position: relative; display: inline-block; user-select: none; }
.empty { color: #d4d4dc; }
.fill { position: absolute; left: 0; top: 0; overflow: hidden; color: #f5b50a; }
</style>`,
          "/src/App.vue": `<template>
  <div class="wrap">
    <h2>Rate your experience</h2>
    <p>Hover the left vs right half of a star. Arrow keys work too.</p>
    <StarRating v-model="rating" :precision="0.5" />
    <p class="out">You rated: <strong>{{ rating }}</strong> / 5</p>
    <hr />
    <p>Read-only display (3.5):</p>
    <StarRating :model-value="3.5" readonly :size="24" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import StarRating from './components/StarRating.vue';
const rating = ref(2.5);
</script>

<style>
.wrap { font-family: system-ui, sans-serif; padding: 32px; text-align: center; color: #111; }
.out { margin-top: 18px; font-size: 18px; }
hr { margin: 24px auto; max-width: 240px; border: none; border-top: 1px solid #e5e5ea; }
</style>`,
        },
      },

      // ─────────────────────────── Angular ───────────────────────────
      angular: {
        answer: `In Angular the rating uses a getter for the active value and Angular's **style binding** for the partial fill — no third-party library.

### Step 1 — State + active getter

~~~ts
value = 2.5;
hover = 0;
get active() { return this.hover || this.value; }
fillFor(i: number) { return Math.max(0, Math.min(1, this.active - i)); }
~~~

### Step 2 — Half-star geometry

Same pointer math against the star's bounding box (cast \`currentTarget\` to \`HTMLElement\`).

~~~ts
ratingFromEvent(e: MouseEvent, i: number) {
  if (this.precision === 1) return i + 1;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const isLeft = e.clientX - rect.left < rect.width / 2;
  return i + (isLeft ? 0.5 : 1);
}
~~~

### Step 3 — Template with style binding

\`*ngFor\` over a fixed-length array; the gold layer's width comes from **\`[style.width.%]\`**.

~~~ts
<span (mousemove)="onMove($event, i)" (click)="onClick($event, i)">
  <span style="color:#d4d4dc">★</span>
  <span [style.width.%]="fillFor(i) * 100">★</span>
</span>
~~~

**Interview tip:** the Angular-specific bits are the **\`[style.width.%]\`** binding for the partial fill and \`(mousemove)\`/\`(mouseleave)\` for the hover preview. Same two-state model and half-star math everywhere.`,
        files: {
          "/src/app/app.component.ts": `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: \`
    <div style="font-family: system-ui, sans-serif; padding: 32px; text-align: center">
      <h2>Rate your experience</h2>
      <p style="color:#666">Hover the left vs right half of a star. Arrow keys work too.</p>

      <div class="rating" role="radiogroup" aria-label="Rating" tabindex="0"
           (mouseleave)="hover = 0" (keydown)="onKeyDown($event)"
           style="display:inline-flex; gap:4px; outline:none">
        <span
          *ngFor="let s of stars; let i = index"
          (mousemove)="onMove($event, i)"
          (click)="onClick($event, i)"
          style="position:relative; display:inline-block; width:36px; height:36px; font-size:36px; line-height:36px; cursor:pointer; user-select:none">
          <span style="color:#d4d4dc">★</span>
          <span style="position:absolute; left:0; top:0; overflow:hidden; color:#f5b50a"
                [style.width.%]="fillFor(i) * 100">★</span>
        </span>
      </div>

      <p style="margin-top:18px; font-size:18px">You rated: <strong>{{ value }}</strong> / 5</p>
    </div>
  \`,
})
export class AppComponent {
  count = 5;
  precision = 0.5;
  value = 2.5;
  hover = 0;
  stars = Array(5).fill(0);

  get active() { return this.hover || this.value; }

  fillFor(i: number) {
    return Math.max(0, Math.min(1, this.active - i));
  }

  ratingFromEvent(e: MouseEvent, i: number) {
    if (this.precision === 1) return i + 1;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isLeft = e.clientX - rect.left < rect.width / 2;
    return i + (isLeft ? 0.5 : 1);
  }

  onMove(e: MouseEvent, i: number) { this.hover = this.ratingFromEvent(e, i); }
  onClick(e: MouseEvent, i: number) { this.value = this.ratingFromEvent(e, i); }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this.value = Math.min(this.count, this.value + this.precision); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); this.value = Math.max(0, this.value - this.precision); }
  }
}`,
        },
      },
    },
  },
];

export default augments;
