import type { MachineCodingAugment } from "./machine-coding-augments.types";

/**
 * Machine Coding tutorial — "Build an OTP Input" in React / Vue / Angular.
 * Each framework bundle = a step-by-step tutorial (answer, ~~~ tilde fences) +
 * a runnable multi-file solution (files). All code is backslash-free
 * ([0-9]/[^0-9]) and ${}-free; Angular inline template uses escaped backticks.
 */
const augments: MachineCodingAugment[] = [
  {
    title: "Build an OTP Input",
    frameworks: {
      // ─────────────────────────── React ───────────────────────────
      react: {
        answer: `An **OTP (one-time-password) input** is the row of single-character boxes you fill after a 2FA / SMS code is sent. It looks trivial, but a *good* implementation forces you to handle **focus management, keyboard events, paste, and controlled inputs** all at once.

### The mental model (the part that matters)

The single source of truth is **one array of N strings** — the value of each box. Separately, keep **one ref per input** so you can move focus *imperatively* without re-rendering. Holding the **data (array)** and the **DOM handles (refs)** as two separate things is the core idea.

~~~jsx
const [values, setValues] = useState(() => Array(length).fill(''));
const refs = useRef([]);
~~~

### Step 1 — Typing & auto-advance

Keep only the **last** character (so retyping in a full box replaces it), accept **digits only**, write it into the array, then focus the next box.

~~~jsx
function handleChange(i, raw) {
  const char = raw.slice(-1);                 // last typed char wins
  if (char && !/[0-9]/.test(char)) return;    // ignore non-digits
  setValues((prev) => { const next = [...prev]; next[i] = char; return next; });
  if (char && i < length - 1) focusBox(i + 1); // auto-advance
}
~~~

### Step 2 — Backspace (the tricky one)

Handle it in \`onKeyDown\` so you can act *before* the value changes. If the box is **already empty**, move focus back and clear the previous box.

~~~jsx
function handleKeyDown(i, e) {
  if (e.key === 'Backspace' && !values[i] && i > 0) {
    e.preventDefault();
    focusBox(i - 1);
    setValues((prev) => { const next = [...prev]; next[i - 1] = ''; return next; });
  }
}
~~~

### Step 3 — Paste

Strip non-digits, drop one char per box from the focused index, land focus on the last filled box.

~~~jsx
const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
~~~

### Step 4 — Report + a11y

A \`useEffect\` joins the array and fires \`onChange\`/\`onComplete\`. Add \`inputMode="numeric"\` (mobile keypad) and \`autoComplete="one-time-code"\` on the first box (SMS autofill).

| Case | Expected |
| --- | --- |
| Type into a full box | Replace with the new digit |
| Backspace on empty box | Move back and clear previous |
| Paste with spaces/dashes | Strip non-digits first |

**Interview tip:** lead with *one array of values + one ref per box*, then build typing → backspace → paste. The **\`slice(-1)\` replace trick** and **empty-box Backspace** rule are the senior signals.`,
        files: {
          "/src/OtpInput.js": `import { useState, useRef, useEffect } from 'react';

export default function OtpInput({ length = 6, onChange, onComplete }) {
  const [values, setValues] = useState(() => Array(length).fill(''));
  const refs = useRef([]);

  useEffect(() => { if (refs.current[0]) refs.current[0].focus(); }, []);

  useEffect(() => {
    const code = values.join('');
    if (onChange) onChange(code);
    if (code.length === length && onComplete) onComplete(code);
  }, [values, length, onChange, onComplete]);

  function focusBox(i) {
    const el = refs.current[i];
    if (el) { el.focus(); el.select(); }
  }

  function handleChange(i, raw) {
    const char = raw.slice(-1);
    if (char && !/[0-9]/.test(char)) return;
    setValues((prev) => { const next = [...prev]; next[i] = char; return next; });
    if (char && i < length - 1) focusBox(i + 1);
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !values[i] && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
      setValues((prev) => { const next = [...prev]; next[i - 1] = ''; return next; });
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusBox(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focusBox(i + 1);
    }
  }

  function handlePaste(i, e) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!digits) return;
    setValues((prev) => {
      const next = [...prev];
      for (let k = 0; k < digits.length && i + k < length; k++) next[i + k] = digits[k];
      return next;
    });
    focusBox(Math.min(i + digits.length, length - 1));
  }

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={v}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={'Digit ' + (i + 1)}
          maxLength={1}
          style={{ width: 48, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700, borderRadius: 12, border: '2px solid #c7c7d1', background: '#fff', color: '#111' }}
        />
      ))}
    </div>
  );
}`,
          "/App.js": `import { useState } from 'react';
import OtpInput from './src/OtpInput';

export default function App() {
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, textAlign: 'center' }}>
      <h2 style={{ marginBottom: 6 }}>Verify your number</h2>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 20 }}>
        Enter the 6-digit code. Try typing, pasting "123456", and backspace.
      </p>
      <div style={{ display: 'inline-block' }}>
        <OtpInput length={6}
          onChange={(v) => { setCode(v); setDone(false); }}
          onComplete={(v) => { setCode(v); setDone(true); }} />
      </div>
      <p style={{ marginTop: 22, fontFamily: 'monospace', fontSize: 16 }}>
        value: {code || '(empty)'} {done ? 'OK' : ''}
      </p>
    </div>
  );
}`,
        },
      },

      // ─────────────────────────── Vue ───────────────────────────
      vue: {
        answer: `An **OTP input** in Vue 3 (\`<script setup>\`) leans on the same mental model as any framework: **one reactive array of N strings** is the source of truth, plus **one DOM ref per input** so you can move focus imperatively.

### The mental model

~~~html
<script setup>
import { reactive } from 'vue';
const values = reactive(Array(6).fill(''));  // data (drives render)
const boxes = [];                            // DOM handles (focus control)
</script>
~~~

### Step 1 — Render with v-for + a function ref

Use a **function ref** to collect each input element by index. Bind \`:value\` one-way and react to \`@input\`.

~~~html
<input
  v-for="(v, i) in values" :key="i"
  :ref="(el) => (boxes[i] = el)"
  :value="v"
  @input="onInput(i, $event)"
  @keydown="onKeyDown(i, $event)"
  @paste="onPaste(i, $event)"
  inputmode="numeric" maxlength="1" />
~~~

### Step 2 — Typing & auto-advance

Take the last char, accept digits only, write the reactive array, then focus the next box.

~~~html
function onInput(i, e) {
  const char = e.target.value.slice(-1);
  if (char && !/[0-9]/.test(char)) { e.target.value = values[i]; return; }
  values[i] = char;
  if (char && i < values.length - 1) focusBox(i + 1);
}
~~~

### Step 3 — Backspace & paste

Backspace on an **empty** box walks back and clears the previous one; paste strips non-digits and distributes across boxes.

~~~html
function onKeyDown(i, e) {
  if (e.key === 'Backspace' && !values[i] && i > 0) {
    e.preventDefault(); values[i - 1] = ''; focusBox(i - 1);
  }
}
~~~

### Step 4 — Report with watch

A \`watch\` on the reactive array joins it and \`emit\`s \`change\`/\`complete\` — no need to repeat it in every handler.

~~~html
watch(values, () => {
  const code = values.join('');
  emit('change', code);
  if (code.length === values.length) emit('complete', code);
});
~~~

**Interview tip:** the Vue-specific points are the **function ref** for the v-for inputs (\`:ref="(el) => boxes[i] = el"\`) and driving everything from a **reactive array** + a single \`watch\`. The keyboard/paste logic is identical to any framework.`,
        files: {
          "/src/components/OtpInput.vue": `<template>
  <div class="otp">
    <input
      v-for="(v, i) in values"
      :key="i"
      :ref="(el) => (boxes[i] = el)"
      :value="v"
      @input="onInput(i, $event)"
      @keydown="onKeyDown(i, $event)"
      @paste="onPaste(i, $event)"
      inputmode="numeric"
      maxlength="1"
      :aria-label="'Digit ' + (i + 1)"
      class="box"
    />
  </div>
</template>

<script setup>
import { reactive, watch, onMounted } from 'vue';

const props = defineProps({ length: { type: Number, default: 6 } });
const emit = defineEmits(['change', 'complete']);

const values = reactive(Array(props.length).fill(''));
const boxes = [];

onMounted(() => focusBox(0));

function focusBox(i) {
  const el = boxes[i];
  if (el) { el.focus(); el.select(); }
}

function onInput(i, e) {
  const char = e.target.value.slice(-1);
  if (char && !/[0-9]/.test(char)) { e.target.value = values[i]; return; }
  values[i] = char;
  e.target.value = char;
  if (char && i < props.length - 1) focusBox(i + 1);
}

function onKeyDown(i, e) {
  if (e.key === 'Backspace' && !values[i] && i > 0) {
    e.preventDefault();
    values[i - 1] = '';
    focusBox(i - 1);
  } else if (e.key === 'ArrowLeft' && i > 0) {
    focusBox(i - 1);
  } else if (e.key === 'ArrowRight' && i < props.length - 1) {
    focusBox(i + 1);
  }
}

function onPaste(i, e) {
  e.preventDefault();
  const digits = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '');
  if (!digits) return;
  for (let k = 0; k < digits.length && i + k < props.length; k++) values[i + k] = digits[k];
  focusBox(Math.min(i + digits.length, props.length - 1));
}

watch(values, () => {
  const code = values.join('');
  emit('change', code);
  if (code.length === props.length) emit('complete', code);
});
</script>

<style scoped>
.otp { display: flex; gap: 10px; justify-content: center; }
.box {
  width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: 700;
  border-radius: 12px; border: 2px solid #c7c7d1; background: #fff; color: #111;
}
</style>`,
          "/src/App.vue": `<template>
  <div class="wrap">
    <h2>Verify your number</h2>
    <p>Enter the 6-digit code. Try typing, pasting "123456", and backspace.</p>
    <OtpInput :length="6" @change="onChange" @complete="onComplete" />
    <p class="val">value: {{ code || '(empty)' }} {{ done ? 'OK' : '' }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import OtpInput from './components/OtpInput.vue';

const code = ref('');
const done = ref(false);
function onChange(v) { code.value = v; done.value = false; }
function onComplete(v) { code.value = v; done.value = true; }
</script>

<style>
.wrap { font-family: system-ui, sans-serif; padding: 32px; text-align: center; color: #111; }
.val { margin-top: 22px; font-family: monospace; font-size: 16px; }
</style>`,
        },
      },

      // ─────────────────────────── Angular ───────────────────────────
      angular: {
        answer: `An **OTP input** in Angular keeps the same idea — an array of values is the source of truth — but focus is handled with **\`@ViewChildren\`** (a \`QueryList\` of the input elements) instead of refs.

### Step 1 — State + querying the inputs

The component holds \`values\` and queries every input tagged \`#box\`:

~~~ts
@ViewChildren('box') boxes!: QueryList<ElementRef<HTMLInputElement>>;
values: string[] = Array(6).fill('');

focusBox(i: number) {
  const el = this.boxes.toArray()[i]?.nativeElement;
  if (el) { el.focus(); el.select(); }
}
~~~

### Step 2 — Template with *ngFor

Render the inputs one-way with \`[value]\` and listen to native events. No \`FormsModule\`/\`ngModel\` needed.

~~~ts
<input *ngFor="let v of values; let i = index" #box
  [value]="v"
  (input)="onInput(i, $event)"
  (keydown)="onKeyDown(i, $event)"
  (paste)="onPaste(i, $event)"
  inputmode="numeric" maxlength="1" />
~~~

### Step 3 — Typing, backspace, paste

The handlers mirror every other framework: last-char + digits-only on input, empty-box walk-back on Backspace, strip-and-distribute on paste.

~~~ts
onInput(i: number, e: Event) {
  const input = e.target as HTMLInputElement;
  const char = input.value.slice(-1);
  if (char && !/[0-9]/.test(char)) { input.value = this.values[i]; return; }
  this.values[i] = char;
  if (char && i < this.values.length - 1) this.focusBox(i + 1);
}
~~~

**Interview tip:** the Angular-specific bits are **\`@ViewChildren\` + \`QueryList\`** for focus and **\`[value]\` + \`(input)\`** (avoiding \`ngModel\` so no \`FormsModule\` import is required). Everything else is the same OTP logic.`,
        files: {
          "/src/app/app.component.ts": `import { Component, ViewChildren, QueryList, ElementRef } from '@angular/core';

@Component({
  selector: 'app-root',
  template: \`
    <div style="font-family: system-ui, sans-serif; padding: 32px; text-align: center">
      <h2>Verify your number</h2>
      <p style="color:#666">Enter the 6-digit code. Try typing, pasting "123456", and backspace.</p>

      <div style="display:flex; gap:10px; justify-content:center">
        <input
          *ngFor="let v of values; let i = index"
          #box
          [value]="v"
          (input)="onInput(i, $event)"
          (keydown)="onKeyDown(i, $event)"
          (paste)="onPaste(i, $event)"
          inputmode="numeric"
          maxlength="1"
          [attr.aria-label]="'Digit ' + (i + 1)"
          style="width:48px;height:56px;text-align:center;font-size:24px;font-weight:700;border-radius:12px;border:2px solid #c7c7d1" />
      </div>

      <p style="margin-top:22px; font-family:monospace; font-size:16px">
        value: {{ code || '(empty)' }} {{ done ? 'OK' : '' }}
      </p>
    </div>
  \`,
})
export class AppComponent {
  length = 6;
  values: string[] = Array(this.length).fill('');
  code = '';
  done = false;

  @ViewChildren('box') boxes!: QueryList<ElementRef<HTMLInputElement>>;

  focusBox(i: number) {
    const ref = this.boxes.toArray()[i];
    if (ref) { ref.nativeElement.focus(); ref.nativeElement.select(); }
  }

  onInput(i: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const char = input.value.slice(-1);
    if (char && !/[0-9]/.test(char)) { input.value = this.values[i]; return; }
    this.values[i] = char;
    input.value = char;
    if (char && i < this.length - 1) this.focusBox(i + 1);
    this.report();
  }

  onKeyDown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !this.values[i] && i > 0) {
      e.preventDefault();
      this.values[i - 1] = '';
      this.focusBox(i - 1);
      this.report();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      this.focusBox(i - 1);
    } else if (e.key === 'ArrowRight' && i < this.length - 1) {
      this.focusBox(i + 1);
    }
  }

  onPaste(i: number, e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData ? e.clipboardData.getData('text') : '';
    const digits = (text || '').replace(/[^0-9]/g, '');
    if (!digits) return;
    for (let k = 0; k < digits.length && i + k < this.length; k++) this.values[i + k] = digits[k];
    this.focusBox(Math.min(i + digits.length, this.length - 1));
    this.report();
  }

  report() {
    this.code = this.values.join('');
    this.done = this.code.length === this.length;
  }
}`,
        },
      },
    },
  },
];

export default augments;
