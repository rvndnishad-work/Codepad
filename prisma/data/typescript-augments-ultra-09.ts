/**
 * TYPESCRIPT ULTRA — batch 09: Classes and modelling (abstract classes, the polymorphic
 * this type, function overloads, enums, branded types). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What are abstract classes?`,
    difficulty: "medium",
    seoDescription: `Abstract classes in TypeScript: abstract members, the template method pattern, abstract vs interface, abstract new constructor types and run-time erasure.`,
    description: `**Question presented to candidate:**
"What is an abstract class in TypeScript? When would you reach for one instead of an interface, and what does the \`abstract\` keyword actually do at run time?"

**What a strong answer should cover:**
- An abstract class cannot be instantiated with \`new\`; it exists to be extended, and it can mix finished code (fields, constructor, concrete methods) with \`abstract\` members that have no body
- Every non-abstract subclass must implement all abstract members, or tsc reports an error; a subclass can also stay abstract and pass the duty down
- The template method pattern: a concrete base method calls abstract hooks that each subclass fills in
- Abstract class vs interface: the class carries shared code and state and survives to run time (\`instanceof\` works), an interface is a pure shape with no code and is erased
- \`abstract\` itself is compile-time only: the emitted JavaScript is an ordinary class, so the "cannot instantiate" rule is a type check, not a run-time guard
- Constructor types: \`new (...) => T\` rejects an abstract class, \`abstract new (...) => T\` (TypeScript 4.2) accepts it, which is what mixins over abstract bases need

**Code / implementation expected:** Yes — a small abstract base class with one abstract method, two subclasses, and a concrete method that uses the abstract one.`,
    answer: `**Target Audience:** Developers who know basic classes and want to know what \`abstract\` adds, when it beats an interface, and what it does not do.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`; version facts (4.2, 4.3) are cited from their release material.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (a \`// @ts-expect-error\` line fails the build if the error does not happen), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A franchise hands every new restaurant a binder. Most pages are finished: how to greet guests, how to take payment, how to close the till at night. But two pages are blank, with a note in bold: **"Your menu goes here"** and **"Your opening hours go here."** Nobody can open a restaurant with the binder alone — it is not a restaurant yet — and no restaurant is allowed to open until it has filled in those two pages.

An abstract class is that binder. It contains real, working code that every subclass shares, plus a few blank pages — \`abstract\` members — that each subclass must fill in. You can never create an object of the binder itself; you can only create objects of classes that completed it.

📌 **Interview term: abstract class** — a class marked \`abstract\` that cannot be instantiated with \`new\`. It is a base for other classes and may contain both implemented members and \`abstract\` members.

📌 **Interview term: abstract member** — a method or property declared with \`abstract\` and no body (or no initializer). It states a requirement: every concrete subclass must provide it.

📌 **Interview term: concrete class** — any class that is not abstract, so you can call \`new\` on it. A concrete subclass of an abstract class must implement every inherited abstract member.

## 2. The Shape of an Abstract Class

Example 1 builds reports. The base class knows how to render any report; it does not know a report title or its rows.

~~~ts
abstract class Report {
  abstract readonly title: string;
  protected abstract rows(): string[];

  render(): string {
    const body = this.rows().map((r, i) => \`\${i + 1}. \${r}\`).join(" | ");
    return \`[\${this.title}] \${body}\`;
  }
}

class SalesReport extends Report {
  readonly title = "Sales";
  constructor(private totals: number[]) {
    super();
  }
  protected override rows(): string[] {
    return this.totals.map((t) => "$" + t.toFixed(2));
  }
}
~~~

\`render\` is written once, in the base class, and it calls \`rows()\` — a method that does not exist yet. Each subclass supplies it. Code typed as \`Report\` can call \`render()\` on any of them: example 1 stores a \`SalesReport\` and an \`EmptyReport\` in a \`Report[]\` and prints both.

📌 **Interview term: template method pattern** — a base-class method that fixes the overall steps of an algorithm and calls abstract "hook" methods for the steps that vary. Abstract classes are the natural home for it.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Abstract class Report with a concrete render method and an abstract rows method, extended by SalesReport and EmptyReport">
  <defs>
    <marker id="q1arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="210" y="20" width="300" height="100" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">abstract class Report</text>
  <text class="d-sub" x="360" y="76" text-anchor="middle">render() has a body</text>
  <text class="d-sub" x="360" y="100" text-anchor="middle">abstract rows() has none</text>
  <rect class="d-box" x="40" y="220" width="260" height="80" rx="10"/>
  <text class="d-text" x="170" y="252" text-anchor="middle">SalesReport</text>
  <text class="d-sub" x="170" y="278" text-anchor="middle">implements rows()</text>
  <rect class="d-box" x="420" y="220" width="260" height="80" rx="10"/>
  <text class="d-text" x="550" y="252" text-anchor="middle">EmptyReport</text>
  <text class="d-sub" x="550" y="278" text-anchor="middle">implements rows()</text>
  <path class="d-edge" d="M 170 216 L 300 124" marker-end="url(#q1arrow)"/>
  <path class="d-edge" d="M 550 216 L 420 124" marker-end="url(#q1arrow)"/>
</svg>

The arrows point from each subclass to the class it extends. Only the two bottom boxes can be created with \`new\`.

## 3. The Two Rules tsc Enforces

**Rule 1: no \`new\` on the abstract class.** In example 1, \`new Report()\` fails:

~~~text
main.ts(36,16): error TS2511: Cannot create an instance of an abstract class.
~~~

**Rule 2: concrete subclasses must implement every abstract member.** \`class Broken extends Report\` provides \`title\` but forgets \`rows\`, and tsc 5.4.5 reports:

~~~text
main.ts(42,7): error TS18052: Non-abstract class 'Broken' does not implement all abstract members of 'Report'
~~~

A subclass that is itself marked \`abstract\` is exempt: example 1 has \`abstract class TitledReport extends Report\` that fills in only \`title\`, and \`class Final extends TitledReport\` provides \`rows\`. The duty is passed down the chain until a concrete class completes it.

The \`override\` keyword in the examples is optional here but good practice: it tells tsc "this must replace something in the base class," so a renamed base method turns into an error instead of a silently unrelated new method. It arrived in TypeScript 4.3, together with the \`noImplicitOverride\` flag that makes the keyword mandatory ([Visual Studio Magazine on TypeScript 4.3](https://visualstudiomagazine.com/articles/2021/05/28/typescript-4-3.aspx), [TypeScript 4.3 playground example](https://typescriptlang.org/play/4-3/new-ts-features/no-implicit-class-overrides.ts.html)).

📌 **Interview term: \`override\` modifier** — marks a subclass member as replacing a base-class member; tsc errors if the base has no such member.

## 4. What \`abstract\` Does at Run Time: Nothing

This is the detail that separates a memorised answer from an understood one. \`abstract\` is a TypeScript-only keyword. The JavaScript that runs is a normal class. In example 1, the \`new Report()\` line carries a \`// @ts-expect-error\`, which silences the compiler — and then the line runs and really creates an object:

~~~text
direct instance created: true
~~~

\`typeof Report\` prints \`function\`, and \`instanceof Report\` works, because the class is a real value at run time. The "cannot instantiate" rule protects only code that compiles cleanly. If you need a run-time guard too (for example, a library used from plain JavaScript), add one yourself: \`if (new.target === Report) throw new Error("abstract")\` in the constructor. A quick test on 5.4.5 confirmed that such a check throws for \`new (B as any)()\` and still lets a subclass construct normally.

📌 **Interview term: type erasure** — TypeScript removes type-only syntax (annotations, interfaces, \`abstract\`, access modifiers like \`private\`) when it emits JavaScript, so none of it exists while the program runs.

## 5. Abstract Class vs Interface

Example 2 puts them side by side. \`interface Named\` is a pure shape. \`abstract class Animal implements Named\` adds a constructor, a \`name\` field and a finished \`greet()\` that calls the abstract \`sound()\`. A plain object literal can satisfy the interface (\`robot\`), but nothing except a subclass of \`Animal\` is an \`Animal\` at run time:

~~~text
true,true,false
~~~

| | Abstract class | Interface |
| :--- | :--- | :--- |
| Contains code | Yes: fields, constructor, methods | No: shape only |
| Exists at run time | Yes (\`instanceof\` works) | No, fully erased |
| How you use it | \`extends\` (only one base class) | \`implements\` (any number), or any object of the right shape |
| Can require members | \`abstract\` members | Every member is a requirement |
| Access modifiers | \`public\`, \`protected\`, \`private\` | All members public |
| Best for | A family of classes that share real behaviour | A contract many unrelated things can meet |

A good rule: start with an interface; reach for an abstract class when several implementations genuinely share code or state, and you want that code written once. They also combine well — the abstract class can \`implements\` an interface, as \`Animal\` does. The visibility keywords used here are covered in [What are access modifiers in TypeScript classes?](/interview-question/what-are-access-modifiers-in-typescript-classes), and the interface side in [What is the difference between interface and type?](/interview-question/what-is-the-difference-between-interface-and-type)

## 6. Abstract Classes as Values: Constructor Types

Sometimes a function receives a class, not an instance — a factory, a plugin registry, a mixin. Its parameter is a **constructor type**.

- \`new (name: string) => T\` means "something I can call \`new\` on." It rejects an abstract class. Example 2 passes \`Animal\` to such a \`make\` function and gets:

~~~text
main.ts(41,6): error TS2345: Argument of type 'typeof Animal' is not assignable to parameter of type 'new (name: string) => Animal'.
  Cannot assign an abstract constructor type to a non-abstract constructor type.
~~~

- \`abstract new (name: string) => Animal\` accepts abstract and concrete classes alike, but then the function may not call \`new\` on it (example 2's \`tryNew\` gets \`TS2511\` again). TypeScript 4.2 added this \`abstract\` modifier on constructor signatures, mainly so mixins can extend abstract classes ([TypeScript 4.2 playground: abstract class constructors](https://typescriptlang.org/play/4-2/new-ts-features/abstract-class-constructors.ts.html), [Announcing TypeScript 4.2](https://devblogs.microsoft.com/typescript/announcing-typescript-4-2)).

Example 2 ends with exactly that: \`Timestamped(Animal)\` takes the abstract \`Animal\`, returns an abstract class with an extra \`createdAt\` field, and \`Bird\` extends the result and finally implements \`sound()\`.

📌 **Interview term: construct signature** — a type like \`new (...args) => T\` that describes a value you can call with \`new\`. With the \`abstract\` modifier it describes a class that may be abstract.

📌 **Interview term: mixin** — a function that takes a class and returns a new class extending it with extra members, a way to compose behaviour without deep inheritance chains.

## 7. The Constructor-Order Trap

Example 3 shows the bug abstract classes invite. The base constructor calls a subclass hook, but in JavaScript the base constructor runs **before** the subclass field initializers. Reading the abstract property directly in the constructor is caught:

~~~text
main.ts(8,42): error TS2715: Abstract property 'label' in class 'Widget' cannot be accessed in the constructor.
~~~

Calling an abstract **method** from the constructor is not caught, and that method reads the same uninitialized field:

~~~text
direct read: undefined | via method: button undefined
~~~

The fix in example 3 is to pass the data up through \`super("OK")\`, or to keep subclass hooks out of the base constructor entirely and call them later (from \`render()\`, an \`init()\` method, or a factory).

## 8. Verified: Running the Code

All three examples pass \`tsc --strict\` on TypeScript 5.4.5; each \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, an abstract base with a template method:

~~~text
[Sales] 1. $10.00 | 2. $2.50
[Empty] 1. nothing to show
direct instance created: true
[Titled] 1. done
true true
function
~~~

Example 2, abstract class vs interface, and constructor types:

~~~text
Rex says woof; Tom says meow; beep
true,true,false
Fido says woof
Animal Cat
Tweety says tweet 1700000000
~~~

Example 3, the constructor-order trap:

~~~text
direct read: undefined | via method: button undefined
button OK
button OK
~~~

## Common Pitfalls

- **Believing \`abstract\` is enforced at run time.** It is erased; \`new\` on the base class works in JavaScript. Add a \`new.target\` check if plain JavaScript callers matter.
- **Calling abstract methods from the base constructor.** Subclass fields are not initialized yet, so the hook sees \`undefined\`. Pass values through \`super(...)\` instead.
- **Using an abstract class as a pure contract.** If it has no shared code, an interface is lighter, erased, and does not use up the single \`extends\` slot.
- **Typing a class parameter as \`new () => T\` and passing an abstract class.** Use \`abstract new () => T\` when abstract classes must be accepted (and do not call \`new\` on it).
- **Deep abstract hierarchies.** Three or four levels of abstract bases make behaviour hard to trace; prefer composition or small mixins.
- **Forgetting \`override\`.** Without it, renaming the abstract method in the base leaves the old subclass method as an unrelated extra; enable \`noImplicitOverride\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">abstract class</strong> is a class marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abstract</code> that you cannot <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>. It can hold finished code and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abstract</code> members with no body that every concrete subclass must implement.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why use one:</strong> <span style="color:#f0e2c8;">It is the home for shared behaviour across a family of classes, typically the <strong style="color:#ffca28;">template method</strong> pattern: a concrete <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">render()</code> calls an abstract <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rows()</code> hook.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Versus an interface:</strong> <span style="color:#f0e2c8;">An interface is a shape only and is erased; an abstract class carries code, state and a constructor, exists at run time so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">instanceof</code> works, and you can extend only one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compile time only:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abstract</code> is erased. The emitted JavaScript is a normal class, so the no-instantiation rule is a type check, not a run-time guard.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Advanced:</strong> <span style="color:#f0e2c8;">For class-valued parameters, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new () =&gt; T</code> rejects abstract classes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abstract new () =&gt; T</code>, added in 4.2, accepts them, which mixins over abstract bases need.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an abstract class have a constructor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It runs when a subclass calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super(...)</code>. It is the right place to set shared fields, but not to call abstract hooks, because subclass fields are still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> at that point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if a subclass forgets an abstract method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A compile error. tsc 5.4.5 reported <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS18052: Non-abstract class 'Broken' does not implement all abstract members of 'Report'</code>. Marking the subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abstract</code> too is the only way to defer it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you stop someone instantiating it from plain JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abstract</code>, which is erased. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new.target === Base</code> in the constructor and throw if you need a run-time guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can abstract members be private?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. tsc 5.4.5 rejects it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1243: 'private' modifier cannot be used with 'abstract' modifier</code>, since a subclass could never see it to implement it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">protected abstract</code> is the usual choice for hooks that outside code should not call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Abstract class or interface, if you can only pick one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An interface by default, because it is lighter and any object can meet it. Pick the abstract class when there is real shared code; often you use both, with the abstract class implementing the interface.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Abstract class | A class you cannot \`new\`, used as a base; may mix implemented and abstract members |
| Abstract member | A method or property with no body that concrete subclasses must implement |
| Concrete class | A non-abstract class; it can be instantiated |
| Template method pattern | A base method that fixes the steps and calls abstract hooks for the parts that vary |
| \`override\` modifier | Marks a member as replacing a base member; tsc checks the base has it |
| Type erasure | Type-only syntax, including \`abstract\`, is removed from the emitted JavaScript |
| Construct signature | A \`new (...) => T\` type; with \`abstract\`, it also accepts abstract classes |
| Mixin | A function that takes a class and returns an extended class |

**Conclusion:** An abstract class is a partly finished class: it shares real code and state with its subclasses and lists, as \`abstract\` members, the pieces each subclass must supply. tsc stops you from instantiating it and from forgetting a required member, which makes it a good fit for the template method pattern and for families of classes with common behaviour. Remember that all of this is compile-time: the JavaScript is a plain class, the base constructor runs before subclass fields exist, and an interface remains the lighter choice when there is no code to share.`,
    examples: [
      {
        label: `An abstract base class with a template method`,
        code: `// An abstract class: shared code plus members every subclass must provide.
abstract class Report {
  // Abstract members have no body; subclasses must implement them.
  abstract readonly title: string;
  protected abstract rows(): string[];

  // A concrete method that calls the abstract ones (the template method pattern).
  render(): string {
    const body = this.rows().map((r, i) => \`\${i + 1}. \${r}\`).join(" | ");
    return \`[\${this.title}] \${body}\`;
  }
}

class SalesReport extends Report {
  readonly title = "Sales";
  constructor(private totals: number[]) {
    super();
  }
  protected override rows(): string[] {
    return this.totals.map((t) => "$" + t.toFixed(2));
  }
}

class EmptyReport extends Report {
  readonly title = "Empty";
  protected override rows(): string[] {
    return ["nothing to show"];
  }
}

const reports: Report[] = [new SalesReport([10, 2.5]), new EmptyReport()];
for (const r of reports) console.log(r.render());

// 1. You cannot create an instance of the abstract class itself.
// @ts-expect-error Cannot create an instance of an abstract class.
const direct = new Report();
// The directive only silences the checker: the JavaScript still runs.
console.log("direct instance created:", direct instanceof Report);

// 2. A subclass that forgets an abstract member is a compile error.
// @ts-expect-error Non-abstract class 'Broken' does not implement all abstract members of 'Report'
class Broken extends Report {
  readonly title = "Broken";
}

// 3. A subclass may stay abstract and leave the work to its own subclasses.
abstract class TitledReport extends Report {
  readonly title = "Titled";
}
class Final extends TitledReport {
  protected override rows(): string[] {
    return ["done"];
  }
}
console.log(new Final().render());

// 4. instanceof works: an abstract class is still a real class at run time.
console.log(reports[0] instanceof Report, reports[0] instanceof SalesReport);
console.log(typeof Report);`,
      },
      {
        label: `Abstract class vs interface, and abstract constructor types`,
        code: `// Abstract class vs interface, and constructor types.
interface Named {
  name: string;
  greet(): string;
}

abstract class Animal implements Named {
  // Shared state and a constructor live in the abstract class.
  constructor(public name: string) {}
  abstract sound(): string;
  greet(): string {
    return \`\${this.name} says \${this.sound()}\`;
  }
}

class Dog extends Animal {
  sound() {
    return "woof";
  }
}
class Cat extends Animal {
  sound() {
    return "meow";
  }
}

// An interface can be implemented by any object; there is no shared code.
const robot: Named = { name: "R2", greet: () => "beep" };
const all: Named[] = [new Dog("Rex"), new Cat("Tom"), robot];
console.log(all.map((a) => a.greet()).join("; "));

// An interface disappears at run time, an abstract class does not.
console.log(all.map((a) => a instanceof Animal).join(","));

// A plain construct signature means "something you can call new on".
function make<T>(Ctor: new (name: string) => T, name: string): T {
  return new Ctor(name);
}
console.log(make(Dog, "Fido").greet());
// @ts-expect-error Cannot assign an abstract constructor type to a non-abstract constructor type.
make(Animal, "Nobody");

// An abstract construct signature accepts abstract classes too,
// but then the function itself may not call new on it.
function registerKind(Ctor: abstract new (name: string) => Animal): string {
  return Ctor.name;
}
console.log(registerKind(Animal), registerKind(Cat));
function tryNew(Ctor: abstract new (name: string) => Animal): Animal {
  // @ts-expect-error Cannot create an instance of an abstract class.
  return new Ctor("x");
}

// A mixin needs a constructor type; abstract new lets it extend abstract bases.
type AbstractCtor<T = object> = abstract new (...args: any[]) => T;
function Timestamped<B extends AbstractCtor>(Base: B) {
  abstract class WithTime extends Base {
    createdAt = 1700000000;
  }
  return WithTime;
}
class Bird extends Timestamped(Animal) {
  sound() {
    return "tweet";
  }
}
const b = new Bird("Tweety");
console.log(b.greet(), b.createdAt);`,
      },
      {
        label: `The constructor-order trap with abstract hooks`,
        code: `// A trap: the base constructor runs before subclass fields are initialized.
abstract class Widget {
  abstract readonly label: string;
  log: string[] = [];

  constructor() {
    // @ts-expect-error Abstract property 'label' cannot be accessed in the constructor.
    this.log.push("direct read: " + this.label);
    // Calling an abstract method is allowed by the checker, but just as early.
    this.log.push("via method: " + this.describe());
  }
  abstract describe(): string;
}

class Button extends Widget {
  readonly label = "OK";
  describe() {
    return "button " + this.label;
  }
}

const btn = new Button();
console.log(btn.log.join(" | "));
// After construction finishes, the field is set.
console.log(btn.describe());

// The fix: do not call subclass hooks from the base constructor.
// Use a separate init step, or pass the data up through super(...).
abstract class SafeWidget {
  constructor(readonly label: string) {}
  abstract describe(): string;
}
class SafeButton extends SafeWidget {
  constructor() {
    super("OK");
  }
  describe() {
    return "button " + this.label;
  }
}
console.log(new SafeButton().describe());`,
      },
    ],
  },
  {
    title: `What is a polymorphic 'this' type?`,
    difficulty: "medium",
    seoDescription: `The polymorphic this type keeps fluent chains typed in subclasses; also this in parameters, this-based type guards, clone limits and this parameters.`,
    description: `**Question presented to candidate:**
"What is the polymorphic \`this\` type in TypeScript? Show a fluent builder where a subclass adds methods, and explain why returning \`this\` keeps the chain typed when returning the class name does not."

**What a strong answer should cover:**
- Inside a class or interface, \`this\` used as a type means "the type of the object the member was called on," which is the subclass when called on a subclass instance
- Fluent APIs: a base method declared \`(): this\` returns the subclass type, so subclass methods stay available after base-class calls in a chain; an explicit class-name return type loses them
- \`this\` also works in parameter positions (\`equals(other: this)\`) and in interfaces (\`tap(fn: (self: this) => void): this\`)
- \`this\`-based type guards (\`isFile(): this is FileNode\`) narrow the receiver
- Limits: \`this\` behaves like a type parameter, so \`return new Base()\` is not assignable to \`this\`; cloning needs a prototype copy or similar
- Not to be confused with a \`this\` parameter (\`function f(this: Window)\`), which types the receiver of a plain function

**Code / implementation expected:** Yes — a two-level builder whose base methods return \`this\`, chained through a subclass method.`,
    answer: `**Target Audience:** Developers who write or use chainable APIs (builders, query builders, test helpers) and want subclass-friendly typing explained from first principles.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

You join a gym and get a basic card. The front desk can stamp it ("visited Monday") and hand it back. Later you upgrade to a premium card, which also opens the sauna. You hand the premium card to the same front desk, they stamp it — and hand you back... a basic card. The sauna door no longer opens.

That is exactly what happens in a typed builder when a base-class method says it returns the base class. The object you get back at run time is still your premium card; only the **label** the compiler attached to it was downgraded. The polymorphic \`this\` type is the front desk saying "I return whatever card you gave me."

📌 **Interview term: polymorphic \`this\` type** — the type \`this\`, written inside a class or interface, meaning "the type of the receiver at the call site." Called on a subclass instance, it is that subclass type.

📌 **Interview term: fluent interface** (also *method chaining*) — an API where each method returns the object itself, so calls can be chained: \`builder.where(...).limit(...).build()\`.

## 2. The Problem: Returning the Class Name

Example 1 first writes a builder the obvious way:

~~~ts
class FixedBuilder {
  protected parts: string[] = [];
  where(cond: string): FixedBuilder {
    this.parts.push("WHERE " + cond);
    return this;
  }
}
class FixedPaged extends FixedBuilder {
  page(n: number): FixedPaged { /* ... */ return this; }
}

new FixedPaged().where("x = 1").page(1);
~~~

The last line fails, because \`where\` promised a \`FixedBuilder\`:

~~~text
main.ts(46,33): error TS2339: Property 'page' does not exist on type 'FixedBuilder'.
~~~

At run time the method is still there — example 1 prints \`function\` for \`typeof (... as FixedPaged).page\`. The object was never downgraded; the static type was.

## 3. The Fix: Return \`this\`

~~~ts
class QueryBuilder {
  protected parts: string[] = [];
  where(cond: string): this {
    this.parts.push("WHERE " + cond);
    return this;
  }
  limit(n: number): this { /* ... */ return this; }
  build(): string { return this.parts.join(" "); }
}

class PagedQueryBuilder extends QueryBuilder {
  page(n: number, size: number): this {
    this.parts.push(\`OFFSET \${n * size}\`);
    return this.limit(size);
  }
}

const q = new PagedQueryBuilder().where("age > 18").page(2, 10);
~~~

\`where\` is declared in the base class, yet on a \`PagedQueryBuilder\` it returns a \`PagedQueryBuilder\`. Example 1 proves it with \`Equal<typeof q, PagedQueryBuilder>\`, and the chain prints \`WHERE age > 18 OFFSET 20 LIMIT 10\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="A chain on a PagedQueryBuilder: where returns this, which stays PagedQueryBuilder, so page is still available">
  <defs>
    <marker id="q2arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">new Paged()</text>
  <text class="d-sub" x="115" y="98" text-anchor="middle">PagedQueryBuilder</text>
  <rect class="d-box-accent" x="265" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">.where(...)</text>
  <text class="d-sub" x="360" y="98" text-anchor="middle">returns this</text>
  <rect class="d-box" x="510" y="40" width="190" height="80" rx="10"/>
  <text class="d-text" x="605" y="72" text-anchor="middle">.page(...)</text>
  <text class="d-sub" x="605" y="98" text-anchor="middle">still available</text>
  <path class="d-edge-accent" d="M 214 80 L 261 80" marker-end="url(#q2arrow)"/>
  <path class="d-edge-accent" d="M 459 80 L 506 80" marker-end="url(#q2arrow)"/>
  <rect class="d-box-muted" x="265" y="190" width="190" height="80" rx="10"/>
  <text class="d-text" x="360" y="222" text-anchor="middle">returns Base</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">page is lost</text>
  <path class="d-edge-dashed" d="M 360 124 L 360 186" marker-end="url(#q2arrow)"/>
</svg>

The top row is the \`this\` version; the dashed path is what an explicit base-class return type does to the same chain.

Think of \`this\` as a hidden type parameter that every class has: the compiler fills it in with the receiver type at each call, just as it fills in a generic \`T\` from an argument. That is also why it has the limits shown in section 6. Generics in general are covered in [What are generics and why are they useful?](/interview-question/what-are-generics-and-why-are-they-useful)

📌 **Interview term: receiver** — the object a method is called on, the thing before the dot in \`q.where(...)\`. Inside the method, \`this\` refers to it.

## 4. \`this\` in Interfaces and Parameters

**Interfaces.** \`interface Chainable { tap(fn: (self: this) => void): this }\` — each implementer gets its own type back. In example 1, \`Counter implements Chainable\`, and inside the \`tap\` callback \`self.count\` is available because \`self\` is a \`Counter\`, not a bare \`Chainable\`.

**Parameters.** \`this\` can type a parameter: in example 2, \`Point.equals(other: this)\` means "another object of the same class as the receiver." On a \`Point3D\`, \`equals\` therefore demands a \`Point3D\`, and a plain \`Point\` is rejected:

~~~text
main.ts(32,10): error TS2345: Argument of type 'Point' is not assignable to parameter of type 'Point3D'.
  Property 'z' is missing in type 'Point' but required in type 'Point3D'.
~~~

## 5. \`this\`-Based Type Guards

A method can narrow the object it is called on with a return type of \`this is SomeType\`. Example 2 models a file tree:

~~~ts
class FsNode {
  isFile(): this is FileNode { return this instanceof FileNode; }
  isDir(): this is DirNode { return this instanceof DirNode; }
}

function totalSize(n: FsNode): number {
  if (n.isFile()) return n.size;
  if (n.isDir()) return n.children.reduce((sum, c) => sum + totalSize(c), 0);
  return 0;
}
~~~

After \`n.isFile()\`, \`n\` is a \`FileNode\`, so \`n.size\` compiles. The run prints \`42\` for a tree holding files of 10 and 32 bytes. Ordinary \`x is T\` guards are covered in [What is type narrowing and what are type guards?](/interview-question/what-is-type-narrowing-and-what-are-type-guards)

📌 **Interview term: \`this\`-based type guard** — a method whose return type is \`this is T\`; when it returns true, the receiver is narrowed to \`T\` in that branch.

## 6. The Limit: \`this\` Is Not "This Class"

Because \`this\` may be any subclass, a method typed \`(): this\` cannot return a fresh base-class object. Example 2's \`cloneWrong\` tries \`return new Point(this.x, this.y)\`:

~~~text
main.ts(11,5): error TS2322: Type 'Point' is not assignable to type 'this'.
  'Point' is assignable to the constraint of type 'this', but 'this' could be instantiated with a different subtype of constraint 'Point'.
~~~

That message is the compiler being right: called on a \`Point3D\`, the method would return a \`Point\` while promising a \`Point3D\`. The working \`clone()\` in example 2 copies the prototype, so a \`Point3D\` clones to a \`Point3D\`:

~~~ts
clone(): this {
  return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
}
~~~

The run prints \`true 3 true false\`: the clone is a \`Point3D\`, has \`z = 3\`, is \`equals\` to the original and is a different object. (\`Object.create\` returns \`any\`, which is why this compiles without a cast; it is a shallow copy.)

## 7. Not the Same Thing: the \`this\` Parameter

A \`this\` **parameter** is a fake first parameter on a function that types the receiver of a plain function — it has nothing to do with subclasses:

~~~ts
function describe(this: { name: string }, prefix: string): string {
  return prefix + this.name;
}
describe.call({ name: "box" }, "name: ");   // ok
describe("loose call");                      // error
~~~

~~~text
main.ts(69,1): error TS2684: The 'this' context of type 'void' is not assignable to method's 'this' of type '{ name: string; }'.
~~~

The parameter is erased from the JavaScript. Note that the page runs code in sloppy mode, so a plain call like \`describe("loose call")\` gets the global object as \`this\` at run time; the type error is the only protection.

| | Polymorphic \`this\` type | \`this\` parameter |
| :--- | :--- | :--- |
| Where | Return or parameter types inside a class or interface | First parameter of a function |
| Means | The receiver type at the call site | The required type of the receiver |
| Typical use | Fluent builders, \`equals\`, type guards | Callbacks and functions used with \`call\`/\`bind\` |

## 8. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, a fluent builder with \`this\` vs an explicit return type:

~~~text
WHERE age > 18 OFFSET 20 LIMIT 10
function
count is 1
2
~~~

Example 2, \`this\` in parameters, type guards, \`clone()\` and the \`this\` parameter:

~~~text
true 3 true false
42
name: box
~~~

## Common Pitfalls

- **Returning the class name from a chainable base method.** Subclass methods vanish from the chain. Return \`this\`.
- **Returning a new instance from a \`this\` method.** \`new Base()\` is not assignable to \`this\`; build the copy from the receiver's own prototype or constructor, or return a concrete class type and give up subclass typing.
- **Arrow-function class fields.** \`where = (c: string): this => ...\` works for typing, but each instance gets its own copy and a subclass cannot call \`super.where\` (tsc 5.4.5: \`TS2855: Class field 'where' defined by the parent class is not accessible in the child class via super\`); prefer methods for chainable APIs.
- **Mixing up the \`this\` type and the \`this\` parameter.** One is about subclasses, the other about how a plain function is called.
- **Expecting \`this\` outside classes and interfaces.** In an object type alias (\`type T = { f(): this }\`) or a standalone function return type, tsc 5.4.5 rejects it with \`TS2526: A 'this' type is available only in a non-static member of a class or interface\`. It is also unavailable in \`static\` members.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Inside a class or interface, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> as a type means the type of the <strong style="color:#ffca28;">receiver</strong> at the call site, so on a subclass instance it is the subclass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Main use:</strong> <span style="color:#f0e2c8;">Fluent builders. A base <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">where(): this</code> called on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PagedQueryBuilder</code> returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PagedQueryBuilder</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.page()</code> is still available. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">where(): QueryBuilder</code>, tsc says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Property 'page' does not exist</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Other positions:</strong> <span style="color:#f0e2c8;">It works for parameters, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals(other: this)</code>, in interfaces, and in type guards: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isFile(): this is FileNode</code> narrows the object you called it on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The limit:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> behaves like a hidden type parameter, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return new Base()</code> is not assignable to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code>; tsc says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> could be a different subtype. Clone from the receiver prototype instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Do not confuse:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> <strong style="color:#ffca28;">parameter</strong>, as in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function f(this: Foo)</code>, types the receiver of a plain function. It is unrelated to subclassing and is erased.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not make the builder generic instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Builder&lt;Self extends Builder&lt;Self&gt;&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Sub extends Builder&lt;Sub&gt;</code> (that pattern also compiles on 5.4.5), but every subclass must pass itself in and the base must cast <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this as unknown as Self</code>. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> type gives the same result with no type parameters and is what the compiler already tracks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code> return type change the JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The emitted code is the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return this</code>. Only the static type of the result changes; the object was always the subclass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return new Point()</code> fail in a method typed <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(): this</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Called on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point3D</code>, that method would promise a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point3D</code> and return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point</code>. tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'Point' is assignable to the constraint of type 'this', but 'this' could be instantiated with a different subtype</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code> as a type in a type alias or a plain function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. tsc 5.4.5 reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2526: A 'this' type is available only in a non-static member of a class or interface</code>. It is a class and interface feature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code> in a callback inside a method typed with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">this</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the method body <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> is the receiver. In a callback, use an arrow function to keep it, or pass the object explicitly as the interface <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tap(fn: (self: this) =&gt; void)</code> does.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Polymorphic \`this\` type | \`this\` as a type inside a class or interface: the receiver type at each call |
| Fluent interface | An API whose methods return the object so calls can be chained |
| Receiver | The object a method is called on |
| \`this\`-based type guard | A method returning \`this is T\`, narrowing the receiver when true |

**Conclusion:** The polymorphic \`this\` type lets a base class say "I return whatever you called me on," which is what keeps fluent chains typed when subclasses add methods. It also works for parameters, interfaces and type guards. Because it stands for any possible subclass, you cannot return a new base instance where \`this\` is promised, and it should not be confused with the \`this\` parameter, which types the receiver of a plain function.`,
    examples: [
      {
        label: `A fluent builder: returning this vs the class name`,
        code: `// Polymorphic this: a return type that means "whatever class this call was made on".
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

class QueryBuilder {
  protected parts: string[] = [];
  where(cond: string): this {
    this.parts.push("WHERE " + cond);
    return this;
  }
  limit(n: number): this {
    this.parts.push("LIMIT " + n);
    return this;
  }
  build(): string {
    return this.parts.join(" ");
  }
}

class PagedQueryBuilder extends QueryBuilder {
  page(n: number, size: number): this {
    this.parts.push(\`OFFSET \${n * size}\`);
    return this.limit(size);
  }
}

// where() was declared in the base class, yet the chain keeps the subclass type.
const q = new PagedQueryBuilder().where("age > 18").page(2, 10);
const _q: Equal<typeof q, PagedQueryBuilder> = true;
console.log(q.build());

// The same builder written with an explicit class name as the return type.
class FixedBuilder {
  protected parts: string[] = [];
  where(cond: string): FixedBuilder {
    this.parts.push("WHERE " + cond);
    return this;
  }
}
class FixedPaged extends FixedBuilder {
  page(n: number): FixedPaged {
    this.parts.push("PAGE " + n);
    return this;
  }
}
// @ts-expect-error Property 'page' does not exist on type 'FixedBuilder'.
new FixedPaged().where("x = 1").page(1);
// The subclass method is there at run time; only the static type was lost.
console.log(typeof (new FixedPaged().where("x = 1") as FixedPaged).page);

// this in an interface: every implementer gets its own type back.
interface Chainable {
  tap(fn: (self: this) => void): this;
}
class Counter implements Chainable {
  count = 0;
  inc(): this {
    this.count++;
    return this;
  }
  tap(fn: (self: this) => void): this {
    fn(this);
    return this;
  }
}
const c = new Counter().inc().tap((self) => console.log("count is", self.count)).inc();
console.log(c.count);`,
      },
      {
        label: `this in parameters, this type guards, clone() and the this parameter`,
        code: `// this in parameters, this-based type guards, and the clone() trap.
class Point {
  constructor(public x: number, public y: number) {}
  // other must be the same class as the receiver.
  equals(other: this): boolean {
    return this.x === other.x && this.y === other.y;
  }
  // 1. Returning a new base instance is not assignable to this.
  cloneWrong(): this {
    // @ts-expect-error 'Point' is assignable to the constraint of type 'this', but not to this itself.
    return new Point(this.x, this.y);
  }
  // 2. A working clone: copy the prototype, so subclasses get their own class back.
  clone(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }
}

class Point3D extends Point {
  constructor(x: number, y: number, public z: number) {
    super(x, y);
  }
  override equals(other: this): boolean {
    return super.equals(other) && this.z === other.z;
  }
}

const a = new Point3D(1, 2, 3);
const b = a.clone();
console.log(b instanceof Point3D, b.z, a.equals(b), a === b);
// @ts-expect-error A plain Point is missing z, so it is not this for a Point3D.
a.equals(new Point(1, 2));

// 3. this-based type guards: a method that narrows the object it is called on.
class FsNode {
  constructor(public name: string) {}
  isFile(): this is FileNode {
    return this instanceof FileNode;
  }
  isDir(): this is DirNode {
    return this instanceof DirNode;
  }
}
class FileNode extends FsNode {
  constructor(name: string, public size: number) {
    super(name);
  }
}
class DirNode extends FsNode {
  constructor(name: string, public children: FsNode[]) {
    super(name);
  }
}

function totalSize(n: FsNode): number {
  if (n.isFile()) return n.size;
  if (n.isDir()) return n.children.reduce((sum, c) => sum + totalSize(c), 0);
  return 0;
}
const tree = new DirNode("root", [new FileNode("a.txt", 10), new DirNode("src", [new FileNode("b.ts", 32)])]);
console.log(totalSize(tree));

// 4. A this parameter is different: it types the receiver of a plain function.
function describe(this: { name: string }, prefix: string): string {
  return prefix + this.name;
}
console.log(describe.call({ name: "box" }, "name: "));
// @ts-expect-error The 'this' context of type 'void' is not assignable to method's 'this'.
describe("loose call");`,
      },
    ],
  },
  {
    title: `What are function overloads?`,
    difficulty: "medium",
    seoDescription: `TypeScript function overloads: overload and implementation signatures, resolution order, union arguments, and when a union or generic is better.`,
    description: `**Question presented to candidate:**
"What are function overloads in TypeScript? Write a function whose return type depends on how it is called, and tell me when you would use overloads instead of a union parameter or a generic."

**What a strong answer should cover:**
- Overloads are several call signatures (bodiless declarations) followed by one implementation; callers see only the overload signatures, never the implementation signature
- Resolution goes top to bottom and picks the first overload that matches, so specific signatures must come before general ones
- The implementation signature must be compatible with every overload, or tsc reports \`TS2394\`
- A union-typed argument matches no single overload: overloads do not combine, which is a common surprise
- Alternatives: a union parameter when the return type does not depend on the input, a generic (possibly with a conditional return type) when it does in a regular way; overloads for a few distinct, irregular shapes
- Where overloads appear: methods, overloaded call signatures in a type (usable with arrow functions), and the fact that \`ReturnType\` / \`Parameters\` see only the last overload

**Code / implementation expected:** Yes — a function with two or three overload signatures and one implementation, called in each way.`,
    answer: `**Target Audience:** Developers who type functions that accept several argument shapes and want precise return types, explained from first principles.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A post office has one counter but a sign above it listing what you can hand over: "Letter → you get a stamp receipt. Parcel + weight → you get a tracking number." Behind the counter is one clerk who handles everything. Customers read the sign, not the clerk's internal notes, and if you show up with something that is not on the sign — a parcel with no weight — you are turned away before the clerk even looks at it.

Function overloads are that sign. You list the exact ways a function may be called and what each one returns; one implementation does the work behind them. Callers only ever see the sign.

📌 **Interview term: function overloads** — a set of call signatures for one function, written as bodiless declarations, followed by a single implementation that handles all of them.

📌 **Interview term: overload signature** — one of the bodiless declarations; it is what callers are checked against.

📌 **Interview term: implementation signature** — the signature on the function that has the body. It must be general enough to accept every overload, and it is **not** callable from outside.

## 2. The Shape of Overloads

~~~ts
function toArray(value: string): string[];
function toArray(value: number, length: number): number[];
function toArray(value: string | number, length?: number): (string | number)[] {
  if (typeof value === "string") return value.split("");
  return Array.from({ length: length ?? 0 }, () => value);
}

const letters = toArray("abc");   // string[]
const zeros = toArray(0, 3);      // number[]
~~~

Without overloads, the best single signature would return \`(string | number)[]\` for every call, and the caller would have to narrow. With them, example 1 checks \`Equal<typeof letters, string[]>\` and \`Equal<typeof zeros, number[]>\`, and prints \`["a","b","c"] [0,0,0]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="Callers are checked against two overload signatures; one hidden implementation handles both">
  <defs>
    <marker id="q3arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="210" height="70" rx="10"/>
  <text class="d-text" x="125" y="60" text-anchor="middle">toArray(abc)</text>
  <text class="d-sub" x="125" y="84" text-anchor="middle">caller</text>
  <rect class="d-box" x="20" y="180" width="210" height="70" rx="10"/>
  <text class="d-text" x="125" y="210" text-anchor="middle">toArray(0, 3)</text>
  <text class="d-sub" x="125" y="234" text-anchor="middle">caller</text>
  <rect class="d-box-accent" x="280" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="380" y="60" text-anchor="middle">overload 1</text>
  <text class="d-sub" x="380" y="84" text-anchor="middle">string to string[]</text>
  <rect class="d-box-accent" x="280" y="180" width="200" height="70" rx="10"/>
  <text class="d-text" x="380" y="210" text-anchor="middle">overload 2</text>
  <text class="d-sub" x="380" y="234" text-anchor="middle">number, length</text>
  <rect class="d-box-muted" x="530" y="100" width="170" height="80" rx="10"/>
  <text class="d-text" x="615" y="134" text-anchor="middle">implementation</text>
  <text class="d-sub" x="615" y="158" text-anchor="middle">hidden from callers</text>
  <path class="d-edge" d="M 234 65 L 276 65" marker-end="url(#q3arrow)"/>
  <path class="d-edge" d="M 234 215 L 276 215" marker-end="url(#q3arrow)"/>
  <path class="d-edge-dashed" d="M 484 65 L 560 96" marker-end="url(#q3arrow)"/>
  <path class="d-edge-dashed" d="M 484 215 L 560 184" marker-end="url(#q3arrow)"/>
</svg>

Callers are matched against the accent boxes only. The dashed arrows are a compile-time promise: the implementation must accept everything the overloads allow.

At run time there is only one JavaScript function. The overload signatures are erased, so the implementation must check its arguments (\`typeof value === "string"\`) to know which case it is in.

## 3. The Rules tsc Applies

**The implementation signature is invisible.** It accepts \`toArray(5)\` with no length, but callers cannot use it. Because only overload 1 takes one argument, tsc reports the mismatch against that overload:

~~~text
main.ts(21,9): error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
~~~

**Overloads are tried top to bottom; the first match wins.** Example 1's config lookup:

~~~ts
function lookup(key: "port"): number;
function lookup(key: "host"): string;
function lookup(key: string): string | number | undefined;
function lookup(key: string): string | number | undefined { /* ... */ }
~~~

\`lookup("port")\` is \`number\`, \`lookup("host")\` is \`string\`, and \`lookup("debug")\` falls through to the general overload — all three checked with \`Equal\`. If the general \`key: string\` overload came first, it would match everything and the specific ones would never be used. Order overloads from most specific to least specific.

**Every overload must be compatible with the implementation.** An overload that takes \`boolean\` when the implementation takes only \`string\`:

~~~text
main.ts(49,10): error TS2394: This overload signature is not compatible with its implementation signature.
~~~

**A union argument does not match.** This surprises people. With \`input: string | number\`, \`toArray(input, 2)\` fails even though the implementation would handle it, because no **single** overload accepts \`string | number\`:

~~~text
main.ts(27,18): error TS2345: Argument of type 'string | number' is not assignable to parameter of type 'number'.
  Type 'string' is not assignable to type 'number'.
~~~

The fix is an extra overload that takes the union (and returns the union), or narrowing before the call.

**When several overloads of the same length fail, the error lists each one.** Example 2 calls \`show(true)\` with \`string\` and \`number\` overloads:

~~~text
main.ts(39,15): error TS2769: No overload matches this call.
  Overload 1 of 2, '(x: string): string', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'string'.
  Overload 2 of 2, '(x: number): string', gave the following error.
    Argument of type 'boolean' is not assignable to parameter of type 'number'.
~~~

📌 **Interview term: overload resolution** — the process by which tsc checks a call against each overload signature in declaration order and uses the first one that fits.

## 4. Overloads vs a Union vs a Generic

Example 2 shows the alternatives, and they are often better:

- **Union parameter** — \`function len(x: string | unknown[]): number\`. When the return type is the same for every input, one signature is simpler than two overloads.
- **Generic with a conditional return type** — \`read<T extends "json" | "text">(kind: T, raw: string): Parsed<T>\`. It follows a rule ("json gives object, text gives string") and scales to many cases, but inside the body tsc cannot narrow \`Parsed<T>\`, so the implementation needs a cast. Conditional types are covered in [What are conditional types?](/interview-question/what-are-conditional-types)
- **Overloads** — best for a few distinct, irregular shapes: different parameter counts, different parameter types that map to unrelated return types, a DOM-style \`createElement("div")\` family.

| Need | Reach for |
| :--- | :--- |
| Same return type for all inputs | A union parameter |
| Return type follows a regular rule from an input type | A generic, perhaps with a conditional return |
| A handful of unrelated call shapes | Overloads |
| Callers often pass a union | A union-returning overload, or a generic |

## 5. Where Else Overloads Live

**Methods.** Class methods overload the same way; example 2's \`Store.get(key: string)\` returns \`number | undefined\` and \`get(keys: string[])\` returns an array, both verified with \`Equal\`.

**Overloaded call signatures in a type.** Arrow functions cannot use overload declaration syntax, but you can give them an overloaded type:

~~~ts
type Format = {
  (d: Date): string;
  (d: number, unit: "s" | "ms"): string;
};
const format: Format = (d: Date | number, unit?: "s" | "ms") => /* ... */;
~~~

Example 2 prints \`2024-01-15 1.5s 3s\` from its three calls.

**Utility types see only the last overload.** \`ReturnType<Format>\` is \`string\` and \`Parameters<Format>\` is \`[d: number, unit: "s" | "ms"]\` — the last signature — and \`Parameters<Store["get"]>\` is \`[keys: string[]]\`. Example 2 checks all three with \`Equal\`. If a library function is overloaded, \`Parameters<typeof fn>\` may not describe the call you are making. See [What do ReturnType and Parameters do?](/interview-question/what-do-returntype-and-parameters-do)

📌 **Interview term: call signature** — the \`(params): Return\` part of a function type. A type with several call signatures is an overloaded function type.

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, overload signatures, ordering and compatibility:

~~~text
["a","b","c"] [0,0,0]
8081 LOCALHOST undefined
ok
~~~

Example 2, the alternatives and overloads in types:

~~~text
5 2
{"a":1} plain
2024-01-15 1.5s 3s
1 [1,2]
ReturnType and Parameters use the last signature
~~~

## Common Pitfalls

- **Putting the general overload first.** It swallows every call, and the specific overloads are never chosen. Most specific first.
- **Expecting the implementation signature to be callable.** It is not; add an overload for every shape callers should use.
- **Forgetting the union case.** Callers holding a \`string | number\` match no overload. Add a union overload or use a generic.
- **Trusting the overloads inside the body.** The implementation sees only its own wide signature; you must narrow the arguments yourself, and nothing checks that each branch returns what its overload promised. In a side test on 5.4.5, an implementation returning \`[1, 2]\` for a string argument compiled cleanly, and a variable typed \`string[]\` ended up holding \`[1,2]\`.
- **Overloads that differ only by an optional trailing parameter.** One signature with an optional parameter says the same thing more simply.
- **Using \`Parameters\` or \`ReturnType\` on an overloaded function.** You get the last overload only.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Overloads</strong> are several bodiless call signatures followed by one implementation. Callers are checked against the overload signatures; the <strong style="color:#ffca28;">implementation signature</strong> is hidden.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">They let the return type depend on how the function is called: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toArray("abc")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toArray(0, 3)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number[]</code>, where one wide signature would return a union every time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rules:</strong> <span style="color:#f0e2c8;">Overloads are tried top to bottom and the first match wins, so put specific ones first. Each must be compatible with the implementation, or tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2394</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Gotchas:</strong> <span style="color:#f0e2c8;">A union argument matches no single overload. The body must narrow its own arguments, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReturnType</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Parameters</code> see only the last overload.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternatives:</strong> <span style="color:#f0e2c8;">Use a union parameter when the return type is the same, a generic when it follows a rule, and overloads for a few distinct, irregular shapes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not call the implementation signature directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By design it is an internal, wide signature. Only overload signatures are public; if a shape should be callable, write an overload for it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does passing a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">string | number</code> fail when each part has an overload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Resolution picks one overload per call; none accepts the union. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x: string | number): string[] | number[]</code> as a last overload, or narrow first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the type checker verify each branch of the body against its overload?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The body is checked against the implementation signature only. If the string branch returned numbers, the overloads would still promise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string[]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you overload an arrow function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Give the variable a type with several call signatures, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Format = { (d: Date): string; (d: number, unit: "s" | "ms"): string }</code>, and write one arrow that accepts the widest parameters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Overloads or a generic with a conditional type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A generic scales and keeps one signature, but the body usually needs a cast to the conditional type. Overloads are easier to read when there are two or three unrelated shapes.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Function overloads | Several call signatures plus one implementation for the same function |
| Overload signature | A bodiless declaration callers are checked against |
| Implementation signature | The signature with the body; must accept all overloads; not callable from outside |
| Overload resolution | Checking a call against overloads in order and using the first match |
| Call signature | The \`(params): Return\` part of a function type; several make an overloaded type |

**Conclusion:** Function overloads let one JavaScript function present several precisely typed call shapes, so the return type can follow the arguments. tsc checks callers against the overload list in order, requires the hidden implementation to cover them all, and does not combine overloads for union arguments. Use them for a few distinct shapes, prefer a union parameter or a generic when the relationship is uniform, and remember that the body and utility types like \`ReturnType\` see only one signature.`,
    examples: [
      {
        label: `Overload signatures, ordering and compatibility`,
        code: `// Function overloads: several call signatures, one implementation.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Overload signatures: what callers see.
function toArray(value: string): string[];
function toArray(value: number, length: number): number[];
// Implementation signature: hidden from callers, must cover every overload.
function toArray(value: string | number, length?: number): (string | number)[] {
  if (typeof value === "string") return value.split("");
  return Array.from({ length: length ?? 0 }, () => value);
}

const letters = toArray("abc");
const zeros = toArray(0, 3);
const _l: Equal<typeof letters, string[]> = true;
const _z: Equal<typeof zeros, number[]> = true;
console.log(JSON.stringify(letters), JSON.stringify(zeros));

// The implementation signature is not callable from outside.
// @ts-expect-error A number without a length matches no overload.
toArray(5);

// A union argument matches no single overload, even though the implementation accepts it.
declare const input: string | number;
function useInput() {
  // @ts-expect-error string | number is not assignable to number.
  return toArray(input, 2);
}

// Overloads are tried top to bottom: put the most specific first.
function lookup(key: "port"): number;
function lookup(key: "host"): string;
function lookup(key: string): string | number | undefined;
function lookup(key: string): string | number | undefined {
  const config: Record<string, string | number> = { port: 8080, host: "localhost" };
  return config[key];
}
const port = lookup("port");
const host = lookup("host");
const other = lookup("debug");
const _p: Equal<typeof port, number> = true;
const _h: Equal<typeof host, string> = true;
const _o: Equal<typeof other, string | number | undefined> = true;
console.log(port + 1, host.toUpperCase(), other);

// Each overload must be compatible with the implementation.
function bad(x: string): string;
// @ts-expect-error This overload signature is not compatible with its implementation signature.
function bad(x: boolean): boolean;
function bad(x: string): string {
  return x;
}
console.log(bad("ok"));`,
      },
      {
        label: `Alternatives, overloaded call signatures and ReturnType`,
        code: `// Overloads vs the alternatives, and where overloads show up in types.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Alternative 1: a union parameter is enough when the return type does not depend on the input.
function len(x: string | unknown[]): number {
  return x.length;
}
console.log(len("hello"), len([1, 2]));

// Alternative 2: a generic with a conditional return type.
type Parsed<T> = T extends "json" ? object : string;
function read<T extends "json" | "text">(kind: T, raw: string): Parsed<T> {
  // Inside the body TypeScript cannot narrow Parsed<T>, so a cast is needed.
  return (kind === "json" ? JSON.parse(raw) : raw) as Parsed<T>;
}
const j = read("json", '{"a":1}');
const t = read("text", "plain");
const _j: Equal<typeof j, object> = true;
const _t: Equal<typeof t, string> = true;
console.log(JSON.stringify(j), t);

// Overloads in a type: an overloaded call signature, usable with arrow functions.
type Format = {
  (d: Date): string;
  (d: number, unit: "s" | "ms"): string;
};
const format: Format = (d: Date | number, unit?: "s" | "ms") =>
  typeof d === "number" ? \`\${unit === "s" ? d : d / 1000}s\` : d.toISOString().slice(0, 10);
console.log(format(new Date(Date.UTC(2024, 0, 15))), format(1500, "ms"), format(3, "s"));

// When several overloads of the same arity fail, the error lists each one.
function show(x: string): string;
function show(x: number): string;
function show(x: string | number): string {
  return String(x);
}
function misuse() {
  // @ts-expect-error No overload matches this call.
  return show(true);
}

// Method overloads in a class work the same way.
class Store {
  private data = new Map<string, number>([["a", 1], ["b", 2]]);
  get(key: string): number | undefined;
  get(keys: string[]): (number | undefined)[];
  get(k: string | string[]): number | undefined | (number | undefined)[] {
    return Array.isArray(k) ? k.map((x) => this.data.get(x)) : this.data.get(k);
  }
}
const s = new Store();
const one = s.get("a");
const many = s.get(["a", "b"]);
const _one: Equal<typeof one, number | undefined> = true;
const _many: Equal<typeof many, (number | undefined)[]> = true;
console.log(one, JSON.stringify(many));

// Utility types see only the last overload.
const _r: Equal<ReturnType<Format>, string> = true;
const _params: Equal<Parameters<Format>, [d: number, unit: "s" | "ms"]> = true;
const _getParams: Equal<Parameters<Store["get"]>, [keys: string[]]> = true;
console.log("ReturnType and Parameters use the last signature");`,
      },
    ],
  },
  {
    title: `What are enums and what are their trade-offs?`,
    difficulty: "medium",
    seoDescription: `TypeScript enums explained: numeric reverse mappings, opaque string enums, const enum inlining, erasableSyntaxOnly, and union or as const alternatives.`,
    description: `**Question presented to candidate:**
"What are enums in TypeScript, and would you use them in a new codebase? Compare numeric enums, string enums, \`const enum\`, and a union of string literals or an \`as const\` object."

**What a strong answer should cover:**
- An enum is one of the few TypeScript features that emits run-time code: a real object, and for numeric enums a reverse mapping from number to name
- Numeric enums auto-increment and accept numbers; since 5.0 an out-of-range literal is rejected, but any non-literal \`number\` still is not
- String enums have no reverse mapping and are opaque: the raw string \`"ACTIVE"\` is not assignable to \`Status\`, and two enums with the same values are not interchangeable
- \`const enum\` is inlined by a full \`tsc\` build but not by single-file transpilers, and \`isolatedModules\` forbids ambient const enums
- Alternatives: a union of string literals (zero run-time cost) or an \`as const\` object plus a derived union (named constants, easy iteration, run-time validation)
- Trade-offs today: \`erasableSyntaxOnly\` (TypeScript 5.8) and Node type stripping reject enums because they are not erasable syntax

**Code / implementation expected:** Optional — define a string enum and the equivalent \`as const\` object, and show how each is used and iterated.`,
    answer: `**Target Audience:** Developers deciding how to model a fixed set of values (statuses, roles, directions) and wanting the real behaviour of enums, not folklore.
**Difficulty:** Medium
**TypeScript version:** Behaviour checked with TypeScript 5.4.5 and \`--strict\`; the 5.0 and 5.8 changes are cited from release coverage.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A shop has five kinds of membership: Bronze, Silver, Gold, Platinum, Staff. One team prints them on plastic cards with a code number on the back — handy, but now there is a card printer, a lookup table from number to name, and a rule that only official cards count, even if someone writes "Gold" on a piece of paper. Another team just writes the word on the receipt and keeps a list of the five allowed words. Both work. The first is more official and more machinery; the second is lighter and plays well with everything else that already handles words.

That is the enum debate. A TypeScript \`enum\` is the plastic-card system: it creates a real object at run time and makes its values official. A union of string literals is the list of allowed words: nothing exists at run time, and any matching string is accepted.

📌 **Interview term: enum** — a TypeScript declaration that names a set of constants (\`enum Status { Active, Done }\`) and, unlike most TypeScript syntax, compiles to a JavaScript object.

📌 **Interview term: enum member** — one named constant in the enum, such as \`Status.Active\`. Each member is also usable as a type.

## 2. Numeric Enums

~~~ts
enum Direction {
  Up,        // 0
  Down,      // 1
  Left = 10,
  Right,     // 11
}
~~~

Members without a value count up from the previous one, starting at 0. tsc compiles a numeric enum to an object that maps **both** ways. Example 1 prints it:

~~~text
{"0":"Up","1":"Down","10":"Left","11":"Right","Up":0,"Down":1,"Left":10,"Right":11}
~~~

So \`Direction[11]\` is \`"Right"\`, and \`Object.keys(Direction).length\` is \`8\`, not 4 — iterating a numeric enum needs a filter such as \`isNaN(Number(k))\` to drop the numeric keys.

📌 **Interview term: reverse mapping** — the extra number-to-name entries tsc adds to a numeric enum object, so \`Direction[0] === "Up"\`. String enums do not get them.

**Type checking.** A numeric enum accepts its own numbers. In 5.4.5, an out-of-range **literal** is rejected:

~~~text
main.ts(29,7): error TS2322: Type '5' is not assignable to type 'Direction'.
~~~

That strictness arrived with TypeScript 5.0, which made every enum a "union enum" so each member has its own type ([InfoWorld on TypeScript 5.0](https://www.infoworld.com/article/2337886/whats-new-in-typescript-50.html), [Effective TypeScript: notes on 5.0](https://effectivetypescript.com/2023/02/07/ts-50-beta/)). But a value typed plain \`number\` is still accepted: example 1 assigns \`const n: number = 5\` to a \`Direction\`, it compiles, and \`Direction[d3]\` prints \`undefined\`. Numeric enums are not a validation boundary.

## 3. String Enums

~~~ts
enum Status {
  Active = "ACTIVE",
  Done = "DONE",
}
~~~

Every member needs an explicit string. There is no reverse mapping — example 1 prints \`{"Active":"ACTIVE","Done":"DONE"}\` — so iteration is clean.

String enums are **opaque**: you must write \`Status.Active\`; the raw string is rejected even though it is the same value at run time.

~~~text
main.ts(22,7): error TS2322: Type '"ACTIVE"' is not assignable to type 'Status'.
~~~

And two enums are never interchangeable, even with identical values (\`enum Color { Red = "ACTIVE" }\`):

~~~text
main.ts(40,7): error TS2322: Type 'Color' is not assignable to type 'Status'.
~~~

This is the one place TypeScript behaves **nominally** (by name) rather than structurally — see [What is structural typing?](/interview-question/what-is-structural-typing) and the brand pattern in [What are branded (nominal) types?](/interview-question/what-are-branded-nominal-types). Some teams want exactly that opacity; others find it a nuisance when values arrive as plain strings from JSON or an API.

## 4. \`const enum\`: Inlined, Sometimes

A \`const enum\` asks the compiler to replace each use with its value and emit no object. Whether that happens depends on **which tool compiles the file**. The same source was compiled two ways on 5.4.5:

~~~ts
const enum Level { Low = 1, High = 2 }
console.log(Level.High);
~~~

A full \`tsc\` build inlines it:

~~~text
console.log(Direction.Down, Status.Done, 2 /* Level.High */, Role.Admin);
~~~

A single-file transpile (\`ts.transpile\`, which is what this page uses; other single-file tools work under the same constraint, though their exact output was not checked here) cannot rely on seeing other files, so it emits a normal enum object instead:

~~~text
var Level;
(function (Level) {
    Level[Level["Low"] = 1] = "Low";
    Level[Level["High"] = 2] = "High";
})(Level || (Level = {}));
~~~

And when the const enum is declared in another file (a \`.d.ts\`), \`isolatedModules\` refuses it outright:

~~~text
main.ts(1,13): error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.
~~~

📌 **Interview term: \`const enum\`** — an enum whose uses tsc replaces with literal values. It only disappears under a whole-program \`tsc\` build; single-file tools keep or reject it.

📌 **Interview term: \`isolatedModules\`** — a tsconfig flag that reports code a single-file transpiler cannot compile correctly, such as references to ambient const enums.

## 5. What an Enum Compiles To

The full \`tsc\` output for a numeric enum, a string enum and an \`as const\` object (from the same 5.4.5 run):

~~~text
var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
})(Direction || (Direction = {}));
var Status;
(function (Status) {
    Status["Active"] = "ACTIVE";
    Status["Done"] = "DONE";
})(Status || (Status = {}));
const Role = { Admin: "admin", User: "user" };
~~~

The enum is an IIFE that builds an object; the \`as const\` object is just the object you wrote. Removing the types from the \`as const\` version gives valid JavaScript; removing them from the enum does not — there is nothing left to remove, the \`enum\` keyword itself is the code.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Erasable syntax is deleted to produce JavaScript; an enum must be transformed into new code">
  <defs>
    <marker id="q4arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="240" height="80" rx="10"/>
  <text class="d-text" x="140" y="62" text-anchor="middle">type Role = ...</text>
  <text class="d-sub" x="140" y="88" text-anchor="middle">as const object</text>
  <rect class="d-box-accent" x="460" y="30" width="240" height="80" rx="10"/>
  <text class="d-text" x="580" y="62" text-anchor="middle">types deleted</text>
  <text class="d-sub" x="580" y="88" text-anchor="middle">same object remains</text>
  <rect class="d-box" x="20" y="190" width="240" height="80" rx="10"/>
  <text class="d-text" x="140" y="222" text-anchor="middle">enum Status</text>
  <text class="d-sub" x="140" y="248" text-anchor="middle">TypeScript only syntax</text>
  <rect class="d-box-muted" x="460" y="190" width="240" height="80" rx="10"/>
  <text class="d-text" x="580" y="222" text-anchor="middle">new code generated</text>
  <text class="d-sub" x="580" y="248" text-anchor="middle">IIFE builds an object</text>
  <path class="d-edge-accent" d="M 264 70 L 456 70" marker-end="url(#q4arrow)"/>
  <path class="d-edge-dashed" d="M 264 230 L 456 230" marker-end="url(#q4arrow)"/>
</svg>

The top path is erasure: delete the types and you are done. The bottom path needs a real code transform, which is the root of the tooling trade-off below.

📌 **Interview term: erasable syntax** — TypeScript syntax that can be removed, leaving valid JavaScript with the same behaviour. Enums, namespaces with run-time code and constructor parameter properties are not erasable.

## 6. The Alternatives

Example 2 shows the two common replacements.

**A union of string literals** — no run-time code at all:

~~~ts
type Status = "active" | "done";
label("done");   // plain strings work
label("Done");   // typo caught
~~~

~~~text
main.ts(12,7): error TS2345: Argument of type '"Done"' is not assignable to parameter of type 'Status'.
~~~

**An \`as const\` object plus a derived union** — named constants **and** plain strings:

~~~ts
const Role = { Admin: "admin", Editor: "editor", Viewer: "viewer" } as const;
type Role = (typeof Role)[keyof typeof Role];   // "admin" | "editor" | "viewer"
~~~

\`canEdit(Role.Editor)\` and \`canEdit("viewer")\` both compile; \`Object.values(Role)\` gives exactly the three values; the same object backs a run-time \`isRole(x): x is Role\` guard for unknown input; and a \`switch\` with a \`never\` default is exhaustive. The numeric version, \`{ Low: 1, High: 2 } as const\`, rejects \`3\` just like the 5.0 enum check. The derivation is explained in [How do you get a union of an object's values as a type?](/interview-question/how-do-you-get-a-union-of-an-object-s-values-as-a-type) and [What does as const do?](/interview-question/what-does-as-const-do)

| | Numeric enum | String enum | \`const enum\` | Literal union | \`as const\` object |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Run-time code | Object + reverse map | Object | None with full \`tsc\`, object otherwise | None | The object you wrote |
| Accepts raw values | Any \`number\` (literals checked) | No | Same as base kind | Yes | Yes |
| Named constants | Yes | Yes | Yes | No | Yes |
| Iterate values | Needs filtering | \`Object.values\` | No object to iterate | Keep a separate array | \`Object.values\` |
| Erasable syntax | No | No | No | Yes | Yes |
| Nominal (opaque) | Partly | Yes | Yes | No | No |

## 7. The Tooling Trade-off in 2025-2026

TypeScript 5.8 added \`--erasableSyntaxOnly\`, which makes tsc report enums, namespaces with run-time code and parameter properties as errors. The reason is Node.js type stripping, which runs \`.ts\` files by deleting types and so supports only erasable syntax ([Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8), [Total TypeScript: erasableSyntaxOnly](https://www.totaltypescript.com/erasable-syntax-only)). The 5.8 notes describe Node's mode as unflagged in Node 23.6. This page runs 5.4.5, so the flag itself was not run here.

None of this makes enums wrong: a project compiled by \`tsc\` (or a bundler that transforms enums) handles them fine. It does mean a new codebase that wants to run under type stripping, or that values "the JavaScript is just the TypeScript minus the types," usually picks a union or an \`as const\` object.

## 8. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it. The emitted JavaScript in sections 4 and 5 came from running \`tsc --target ES2022\` and \`ts.transpile\` on a separate file.

Example 1, numeric and string enums:

~~~text
{"0":"Up","1":"Down","10":"Left","11":"Right","Up":0,"Down":1,"Left":10,"Right":11}
0 11 Right
8
{"Active":"ACTIVE","Done":"DONE"} ACTIVE,DONE
true
true undefined
finished
Up,Down,Left,Right
~~~

Example 2, a literal union and an \`as const\` object:

~~~text
finished
true false
admin,editor,viewer 3
editor true
owner false
AV
20
~~~

## Common Pitfalls

- **Treating a numeric enum as validation.** Any \`number\` variable is accepted; only literals are checked. Validate input yourself.
- **Iterating a numeric enum with \`Object.keys\`.** You get both names and numbers (8 keys for 4 members).
- **Relying on \`const enum\` inlining across tools.** A single-file transpiler emits an object or, for ambient const enums under \`isolatedModules\`, an error.
- **Fighting string enum opacity at boundaries.** Values from JSON are plain strings; you must map or cast them into the enum, which an \`as const\` object avoids.
- **Mixing implicit numbers into a persisted format.** Inserting a member in the middle of a numeric enum shifts every later value, breaking stored data. Give persisted enums explicit values.
- **Adopting \`erasableSyntaxOnly\` or Node type stripping without auditing enums.** Each enum becomes an error to migrate.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">enum</strong> names a fixed set of constants, and unlike most TypeScript it emits run-time code: an object, and for numeric enums a <strong style="color:#ffca28;">reverse mapping</strong> from number to name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Numeric vs string:</strong> <span style="color:#f0e2c8;">Numeric enums count up from 0 and accept any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code> variable; since 5.0 only out-of-range literals are rejected. String enums have no reverse map and are opaque: the raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"ACTIVE"</code> is not a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. const enum:</strong> <span style="color:#f0e2c8;">A full <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc</code> build inlines it, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ts.transpile</code> (single-file) emitted a normal object, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedModules</code> rejects ambient const enums with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2748</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Alternatives:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">literal union</strong> has zero run-time cost; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> object plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(typeof X)[keyof typeof X]</code> gives named constants, clean iteration and a run-time list for validation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. My default:</strong> <span style="color:#f0e2c8;">For new code I use a union or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> object, because they are erasable syntax and work with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erasableSyntaxOnly</code> and Node type stripping. I keep enums where the team wants opaque nominal values.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Object.keys</code> on a numeric enum return twice as many keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The emitted object maps names to numbers and numbers back to names. Example 1 printed 8 keys for 4 members; filter with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isNaN(Number(k))</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a numeric enum type-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partly. In 5.4.5, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const d: Direction = 5</code> is an error, but a variable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n: number</code> holding 5 is accepted and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Direction[n]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Treat it as documentation, not validation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are two string enums with the same values incompatible?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enums are compared by declaration, not by value, which is nominal typing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Color.Red</code> is not a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status</code> even if both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"ACTIVE"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">erasableSyntaxOnly</code> have to do with enums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Added in TypeScript 5.8, it errors on syntax that needs a code transform, including enums, so code can run under Node type stripping, which only deletes types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the enum-like ergonomics without an enum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const Role = { Admin: "admin" } as const</code> plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Role = (typeof Role)[keyof typeof Role]</code>. You get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Role.Admin</code>, plain strings are accepted, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.values(Role)</code> is the list.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Enum | A named set of constants that compiles to a JavaScript object |
| Enum member | One constant of the enum, also usable as a type |
| Reverse mapping | Number-to-name entries in a numeric enum object |
| \`const enum\` | An enum inlined by a full \`tsc\` build; kept or rejected by single-file tools |
| \`isolatedModules\` | Flag that reports code a single-file transpiler cannot handle |
| Erasable syntax | TypeScript syntax that can be deleted to leave equivalent JavaScript |

**Conclusion:** Enums give names to a fixed set of values, but they are run-time code: numeric enums build a two-way object and accept any number variable, string enums are clean but opaque, and \`const enum\` only disappears under a whole-program \`tsc\` build. A union of string literals or an \`as const\` object with a derived union covers the same needs with erasable syntax, plain-string compatibility and easy iteration, which is why many teams prefer them for new code — especially with \`erasableSyntaxOnly\` and Node type stripping in the picture. Enums remain a reasonable choice when you want values that cannot be confused with raw strings.`,
    examples: [
      {
        label: `Numeric and string enums at run time and in the checker`,
        code: `// Numeric and string enums: what they compile to and how they type-check.
enum Direction {
  Up,
  Down,
  Left = 10,
  Right,
}
// A numeric enum is a real object with a reverse mapping (number -> name).
console.log(JSON.stringify(Direction));
console.log(Direction.Up, Direction.Right, Direction[11]);
console.log(Object.keys(Direction).length);

enum Status {
  Active = "ACTIVE",
  Done = "DONE",
}
// A string enum has no reverse mapping.
console.log(JSON.stringify(Status), Object.values(Status).join(","));

// String enums are opaque: the plain string is not accepted.
// @ts-expect-error Type '"ACTIVE"' is not assignable to type 'Status'.
const s1: Status = "ACTIVE";
const s2: Status = Status.Active;
console.log(s2 === "ACTIVE");

// Numeric enums accept their numbers, but an out-of-range literal is rejected.
const d1: Direction = 11;
// @ts-expect-error Type '5' is not assignable to type 'Direction'.
const d2: Direction = 5;
// A non-literal number is still accepted: the check is only for literals.
const n: number = 5;
const d3: Direction = n;
console.log(d1 === Direction.Right, Direction[d3]);

// Two enums with the same values are not interchangeable.
enum Color {
  Red = "ACTIVE",
}
// @ts-expect-error Type 'Color' is not assignable to type 'Status'.
const s3: Status = Color.Red;

// Enum members are also types, and switch statements narrow on them.
function label(st: Status): string {
  switch (st) {
    case Status.Active:
      return "in progress";
    case Status.Done:
      return "finished";
  }
}
console.log(label(Status.Done));

// Iterating a numeric enum needs a filter, because of the reverse mapping.
const names = Object.keys(Direction).filter((k) => isNaN(Number(k)));
console.log(names.join(","));`,
      },
      {
        label: `Alternatives: a literal union and an as const object`,
        code: `// The usual alternatives to enums: a literal union, and an as const object.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// 1. A union of string literals: no run-time code at all.
type Status = "active" | "done";
function label(s: Status): string {
  return s === "active" ? "in progress" : "finished";
}
// Plain strings are accepted, and typos are caught.
console.log(label("done"));
// @ts-expect-error Argument of type '"Done"' is not assignable to parameter of type 'Status'.
label("Done");

// 2. An as const object: named constants plus a derived union type.
const Role = {
  Admin: "admin",
  Editor: "editor",
  Viewer: "viewer",
} as const;
type Role = (typeof Role)[keyof typeof Role];
const _role: Equal<Role, "admin" | "editor" | "viewer"> = true;

function canEdit(r: Role): boolean {
  return r === Role.Admin || r === Role.Editor;
}
// Both the named constant and the raw string work.
console.log(canEdit(Role.Editor), canEdit("viewer"));

// Iteration is easy: there is no reverse mapping to filter out.
console.log(Object.values(Role).join(","), Object.keys(Role).length);

// A runtime check for unknown input uses the same object.
const roles: readonly string[] = Object.values(Role);
function isRole(x: string): x is Role {
  return roles.includes(x);
}
for (const input of ["editor", "owner"]) console.log(input, isRole(input));

// Exhaustiveness works the same as with an enum.
function badge(r: Role): string {
  switch (r) {
    case "admin":
      return "A";
    case "editor":
      return "E";
    case "viewer":
      return "V";
    default: {
      const unreachable: never = r;
      return unreachable;
    }
  }
}
console.log([Role.Admin, Role.Viewer].map(badge).join(""));

// 3. A numeric-style set with an as const object keeps numbers as literals.
const Priority = { Low: 1, High: 2 } as const;
type Priority = (typeof Priority)[keyof typeof Priority];
const _prio: Equal<Priority, 1 | 2> = true;
// @ts-expect-error Type '3' is not assignable to type 'Priority'.
const p: Priority = 3;
console.log(Priority.High * 10);`,
      },
    ],
  },
  {
    title: `What are branded (nominal) types?`,
    difficulty: "medium",
    seoDescription: `Branded types simulate nominal typing in TypeScript: string & { __brand }, smart constructors, unique symbol brands, units, and zero run-time cost.`,
    description: `**Question presented to candidate:**
"TypeScript is structurally typed, so a \`UserId\` and an \`OrderId\` that are both strings can be swapped by accident. How would you make the compiler tell them apart, and what does that cost at run time?"

**What a strong answer should cover:**
- Structural typing: two aliases of \`string\` are the same type, so aliases alone give no protection
- A brand intersects the base type with a fake property, \`string & { readonly __brand: "UserId" }\`, so plain strings and other brands are no longer assignable
- Brands are created in one place, a smart constructor or a type guard / assertion function that validates and then casts, so the type means "already checked"
- The brand is type-only: zero run-time cost, the value is still a normal string (\`typeof\` is \`"string"\`), and operations like \`.trim()\` or \`+\` return the unbranded base type
- A \`unique symbol\` key and a generic \`Brand<T, B>\` helper make brands harder to fake and reusable; units of measure (\`Meters\`, \`Seconds\`) are a classic use
- Alternatives and neighbours: classes with a \`#private\` field are nominal, string enums are opaque, and validation libraries offer brand helpers

**Code / implementation expected:** Yes — define two branded ID types, a constructor for each, and show a call that swaps them failing to compile.`,
    answer: `**Target Audience:** Developers who have mixed up two IDs, two units or a raw and a sanitized string, and want the compiler to stop it — explained from first principles.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 and \`--strict\`; \`unique symbol\` dates from TypeScript 2.7 ([TypeScript 2.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html)).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Type claims are checked by \`tsc\` (an \`Equal<...>\` line or a \`// @ts-expect-error\` line), and the **Verified** section quotes the real output in full.

## 1. Why This Even Matters — A Story First

A hospital pharmacy stores medicine in identical white bottles. The pills inside are different, but the bottles look the same, so the shelves are only safe if nobody ever grabs the wrong one. The fix is not new bottles — it is a coloured label stuck on at the moment the pharmacist checks the contents. The label changes nothing about the medicine; it only tells everyone afterwards "this one was checked, and it is this kind."

TypeScript compares types by shape, so to the compiler all strings are identical white bottles. A **brand** is the coloured label: a marker that exists only for the compiler, stuck on at the one place where the value is checked.

📌 **Interview term: structural typing** — TypeScript decides whether one type fits another by comparing their shapes (members and their types), not their names. Covered in depth in [What is structural typing?](/interview-question/what-is-structural-typing)

📌 **Interview term: nominal typing** — types are distinct because of their **name** or declaration, even when their shapes match. Java and C# classes work this way.

📌 **Interview term: branded type** (also *opaque type* or *newtype*) — a type like \`string & { readonly __brand: "UserId" }\` that simulates nominal typing in a structural system.

## 2. The Problem: Aliases Are Just Nicknames

~~~ts
type PlainUserId = string;
type PlainOrderId = string;
const plain: PlainUserId = "u_1" as PlainOrderId;   // compiles
~~~

A type alias is only a second name for the same type. Example 1 prints \`plain aliases mix freely: u_1\`. A function \`cancelOrder(user: string, order: string)\` would accept the arguments in either order, and the bug would surface in production.

## 3. The Brand

~~~ts
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
~~~

The intersection says "a string that **also** has a \`__brand\` property of this exact literal type." No real string has that property, so a plain string no longer fits:

~~~text
main.ts(30,13): error TS2345: Argument of type 'string' is not assignable to parameter of type 'UserId'.
  Type 'string' is not assignable to type '{ readonly __brand: "UserId"; }'.
~~~

And two brands clash on the literal, which is the whole point:

~~~text
main.ts(32,13): error TS2345: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'.
  Type 'OrderId' is not assignable to type '{ readonly __brand: "UserId"; }'.
    Types of property '__brand' are incompatible.
      Type '"OrderId"' is not assignable to type '"UserId"'.
~~~

Going the other way is free: a \`UserId\` **is** a string, so \`user.toUpperCase()\`, \`user.length\` and template literals all work. Intersections are explained in [What are union and intersection types?](/interview-question/what-are-union-and-intersection-types)

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="A raw string passes through a validating constructor to become a UserId; a raw string cannot reach a function that needs a UserId directly">
  <defs>
    <marker id="q5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path class="d-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="72" text-anchor="middle">raw string</text>
  <text class="d-sub" x="110" y="98" text-anchor="middle">from a request</text>
  <rect class="d-box-accent" x="270" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="360" y="72" text-anchor="middle">toUserId</text>
  <text class="d-sub" x="360" y="98" text-anchor="middle">validates, then casts</text>
  <rect class="d-box" x="520" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="610" y="72" text-anchor="middle">UserId</text>
  <text class="d-sub" x="610" y="98" text-anchor="middle">safe to pass on</text>
  <rect class="d-box-muted" x="520" y="210" width="180" height="80" rx="10"/>
  <text class="d-text" x="610" y="242" text-anchor="middle">cancelOrder</text>
  <text class="d-sub" x="610" y="268" text-anchor="middle">needs a UserId</text>
  <path class="d-edge-accent" d="M 204 80 L 266 80" marker-end="url(#q5arrow)"/>
  <path class="d-edge-accent" d="M 454 80 L 516 80" marker-end="url(#q5arrow)"/>
  <path class="d-edge-accent" d="M 610 124 L 610 206" marker-end="url(#q5arrow)"/>
  <path class="d-edge-dashed" d="M 110 124 L 516 250" marker-end="url(#q5arrow)"/>
</svg>

The solid path is the only one that compiles; the dashed shortcut from a raw string straight into \`cancelOrder\` is the \`TS2345\` error above.

## 4. Smart Constructors: Where Brands Come From

Since no real value has a \`__brand\` property, the only way to create one is a type assertion (\`as UserId\`). The discipline is to write that cast in **one** function that checks the value first:

~~~ts
function toUserId(raw: string): UserId {
  if (!/^u_\\d+$/.test(raw)) throw new Error("bad user id: " + raw);
  return raw as UserId;
}
~~~

Now the type carries a meaning: "this string has already passed the check." Code deeper in the system does not re-validate; it just requires a \`UserId\`. Example 1 runs it on \`"u_1"\` and \`"admin"\` and prints \`ok u_1\` and \`Error: bad user id: admin\`. Using \`as\` responsibly is covered in [What are type assertions and when should you use them?](/interview-question/what-are-type-assertions-and-when-should-you-use-them)

📌 **Interview term: smart constructor** — a function that validates a raw value and returns it under a branded type; the only sanctioned way to create the brand.

📌 **Interview term: parse, don't validate** — the habit of turning unchecked input into a more precise type at the boundary, so the rest of the code can rely on the type instead of repeating checks.

A type guard or an assertion function works too. Example 2 uses \`asserts s is Email\`: after \`assertEmail(input)\`, the same variable is an \`Email\` and can be passed to \`sendTo\`. A \`n is PositiveInt\` guard used with \`filter\` turns \`[3, -1, 2.5, 10]\` into a \`PositiveInt[]\` holding \`[3,10]\`. See [What are assertion functions (asserts)?](/interview-question/what-are-assertion-functions-asserts)

## 5. Zero Cost, and Where the Brand Is Lost

The brand exists only in the type system. Example 1 prints \`string {"user":"u_42"}\`: \`typeof\` is \`"string"\`, and JSON has no \`__brand\` key. Nothing is allocated, wrapped or checked at run time beyond what your constructor does.

The flip side: any operation that produces a **new** value returns the base type. \`user.trim()\` is a plain \`string\`, so passing it on fails with the same \`TS2345\` (example 1, line 52). In example 2, \`meters(3) + meters(4)\` is a plain \`number\` (checked with \`Equal\`) and must be re-branded deliberately. That is usually what you want — the result of arithmetic has not been checked — but it means branded code needs small helper functions for the operations you allow.

## 6. A Reusable Brand and \`unique symbol\`

A \`__brand\` string key has two weaknesses: it shows up in autocomplete as if it were real, and anyone can write an object literal with \`__brand: "UserId"\`. A key typed with a \`unique symbol\` that is only ever declared fixes both:

~~~ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type Meters = Brand<number, "Meters">;
type Seconds = Brand<number, "Seconds">;
~~~

\`declare const\` creates a type-level symbol with no run-time value, so no outside code can name the key. Swapping units in \`speed(d: Meters, t: Seconds)\` fails:

~~~text
main.ts(18,7): error TS2345: Argument of type 'Seconds' is not assignable to parameter of type 'Meters'.
  Type 'Seconds' is not assignable to type '{ readonly [brand]: "Meters"; }'.
    Types of property '[brand]' are incompatible.
      Type '"Seconds"' is not assignable to type '"Meters"'.
~~~

📌 **Interview term: \`unique symbol\`** — a subtype of \`symbol\` tied to one specific declaration; two \`unique symbol\` types are never the same, which makes them ideal private keys at the type level. Introduced in TypeScript 2.7.

## 7. Other Ways to Get Nominal Behaviour

- **Classes with a \`#private\` (or \`private\`) field.** Plain classes are structural — example 2 assigns a \`Fahrenheit\` to a \`Celsius\` variable without complaint. Add a \`#kind\` field to each, and they become incompatible:

~~~text
main.ts(68,7): error TS2322: Type 'SafeFahrenheit' is not assignable to type 'SafeCelsius'.
  Property '#kind' in type 'SafeFahrenheit' refers to a different member that cannot be accessed from within type 'SafeCelsius'.
~~~

  The cost is a real object wrapper and a run-time field, unlike a brand.
- **String enums** are compared by declaration and reject raw strings — see [What are enums and what are their trade-offs?](/interview-question/what-are-enums-and-what-are-their-trade-offs) They cover a fixed set of values, not open-ended IDs.

| Technique | Run-time cost | Works for open-ended values | Raw value accepted |
| :--- | :--- | :--- | :--- |
| Type alias | None | Yes | Yes (no protection) |
| Brand (\`T & { __brand }\`) | None | Yes | No, needs a constructor |
| Class with \`#private\` field | Wrapper object | Yes | No |
| String enum | Enum object | No, fixed set | No |

## 8. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5; every \`Equal<...>\` line is a checked claim and every \`// @ts-expect-error\` line is a real error (messages quoted above, from a run with the directives removed). Then each example was run as the page runs it.

Example 1, branded IDs and a smart constructor:

~~~text
plain aliases mix freely: u_1
u_42 cancelled o_7
U_42 4 o_7!
string {"user":"u_42"}
ok u_1
Error: bad user id: admin
~~~

Example 2, a \`Brand\` helper, units, validated values and \`#private\` classes:

~~~text
12.5
7
sent to ada@example.com
[3,10]
structural classes mix: 212
true
~~~

## Common Pitfalls

- **Casting with \`as\` all over the code.** Then the brand means nothing. Keep the cast inside one validating constructor.
- **Expecting the brand at run time.** \`typeof\`, \`instanceof\` and JSON cannot see it. Data coming back from a database or API must go through the constructor again.
- **Forgetting that operations drop the brand.** \`.trim()\`, \`+\` and \`.slice()\` return the base type; write helpers for the operations you allow.
- **Using the same brand literal twice.** Two \`__brand: "Id"\` types are the same type; make each literal (or each \`unique symbol\`) distinct.
- **Branding everything.** Brands add friction at every boundary. Use them where a mix-up is plausible and costly: IDs, units, money, sanitized HTML, validated emails.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Problem:</strong> <span style="color:#f0e2c8;">TypeScript is <strong style="color:#ffca28;">structural</strong>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type UserId = string</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type OrderId = string</code> are the same type and can be swapped silently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Brand:</strong> <span style="color:#f0e2c8;">Intersect with a fake property: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string &amp; { readonly __brand: "UserId" }</code>. A plain string or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">OrderId</code> is then rejected with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2345</code>, while a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UserId</code> is still usable as a string.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Creation:</strong> <span style="color:#f0e2c8;">Brands come from a <strong style="color:#ffca28;">smart constructor</strong>, a type guard or an assertion function that validates and then casts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code>, so the type means already checked.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Zero at run time: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> is still <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"string"</code> and JSON is unchanged. New values from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.trim()</code> or arithmetic lose the brand and must be re-branded on purpose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Refinements:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique symbol</code> key in a generic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Brand&lt;T, B&gt;</code> hides the brand and stops forgery; classes with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> field are another nominal option, at the cost of a wrapper.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the brand property really there on the value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is a lie told only to the type checker. Example 1 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{"user":"u_42"}</code>, with no brand key, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"string"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you brand data loaded from JSON or a database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run it through the same constructor or guard at the boundary. Casting the whole response with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code> skips the check and defeats the point.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unique symbol</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__brand</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A declared-only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique symbol</code> cannot be named by other code, so nobody can write the brand into an object literal, and the key does not appear like a real string property in autocomplete.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">meters(3) + meters(4)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The result is a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">number</code>, checked with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Equal</code> on 5.4.5. Wrap it again, or write an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add(a: Meters, b: Meters): Meters</code> helper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use brands?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the values are a small fixed set, use a literal union instead, and when the risk of mixing is low, the extra constructors cost more than they save.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Structural typing | Types are compatible when their shapes match |
| Nominal typing | Types are distinct by name or declaration |
| Branded type | A base type intersected with a fake marker property to simulate nominal typing |
| Smart constructor | The one function that validates a value and returns it branded |
| Parse, don't validate | Turn unchecked input into a precise type once, at the boundary |
| \`unique symbol\` | A symbol type tied to one declaration, usable as an unforgeable key |

**Conclusion:** Branded types bolt a type-only marker onto a base type so that structurally identical values — user IDs and order IDs, metres and seconds, raw and validated strings — stop being interchangeable. They cost nothing at run time, stay usable as their base type, and gain their meaning from being created only through a validating constructor or guard. Use a \`unique symbol\` key to make them unforgeable, remember that new values lose the brand, and keep them for the places where a mix-up would actually hurt.`,
    examples: [
      {
        label: `Branded IDs and a smart constructor`,
        code: `// Branded types: two strings that the compiler refuses to mix up.
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

// Structural typing alone would not help: these two aliases are the same type.
type PlainUserId = string;
type PlainOrderId = string;
const plain: PlainUserId = "u_1" as PlainOrderId;
console.log("plain aliases mix freely:", plain);

// A smart constructor: the only place that is allowed to create the brand.
function toUserId(raw: string): UserId {
  if (!/^u_\\d+$/.test(raw)) throw new Error("bad user id: " + raw);
  return raw as UserId;
}
function toOrderId(raw: string): OrderId {
  if (!/^o_\\d+$/.test(raw)) throw new Error("bad order id: " + raw);
  return raw as OrderId;
}

function cancelOrder(user: UserId, order: OrderId): string {
  return \`\${user} cancelled \${order}\`;
}

const user = toUserId("u_42");
const order = toOrderId("o_7");
console.log(cancelOrder(user, order));

// @ts-expect-error A raw string has no brand.
cancelOrder("u_42", order);
// @ts-expect-error Arguments swapped: OrderId is not a UserId.
cancelOrder(order, user);

// A branded value is still a string everywhere a string is expected.
console.log(user.toUpperCase(), user.length, \`\${order}!\`);

// The brand exists only in the type system: nothing is added at run time.
console.log(typeof user, JSON.stringify({ user }));

// Validation happens once, at the boundary.
for (const raw of ["u_1", "admin"]) {
  try {
    console.log("ok", toUserId(raw));
  } catch (e) {
    console.log(e);
  }
}

// Operations on a branded value return the plain type: the brand is lost.
const trimmed = user.trim();
// @ts-expect-error trim() returns string, not UserId.
cancelOrder(trimmed, order);`,
      },
      {
        label: `A Brand helper, units, validated values and #private classes`,
        code: `// A reusable Brand helper, numeric units, validated values and class-based nominal types.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// A unique symbol key cannot be written by accident, and is hidden from autocomplete on strings.
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type Meters = Brand<number, "Meters">;
type Seconds = Brand<number, "Seconds">;
const meters = (n: number) => n as Meters;
const seconds = (n: number) => n as Seconds;

function speed(d: Meters, t: Seconds): number {
  return d / t;
}
console.log(speed(meters(100), seconds(8)));
// @ts-expect-error Seconds is not Meters: the units were swapped.
speed(seconds(8), meters(100));

// Arithmetic gives back a plain number, so re-brand on purpose.
const total = meters(3) + meters(4);
const _plain: Equal<typeof total, number> = true;
const totalM: Meters = meters(total);
console.log(totalM);

// A validated brand with an assertion function: after the call, the value is narrowed.
type Email = Brand<string, "Email">;
function assertEmail(s: string): asserts s is Email {
  if (!s.includes("@")) throw new Error("not an email: " + s);
}
function sendTo(to: Email): string {
  return "sent to " + to;
}
const input: string = "ada@example.com";
assertEmail(input);
console.log(sendTo(input));

// A type guard works too, for the non-throwing branch.
type PositiveInt = Brand<number, "PositiveInt">;
const isPositiveInt = (n: number): n is PositiveInt => Number.isInteger(n) && n > 0;
const counts = [3, -1, 2.5, 10].filter(isPositiveInt);
const _counts: Equal<typeof counts, PositiveInt[]> = true;
console.log(JSON.stringify(counts));

// Brands nest: a value can carry two brands at once.
type AdminEmail = Email & { readonly admin: true };
const _sub: Equal<AdminEmail extends Email ? 1 : 0, 1> = true;

// Classes are structural too, unless they have a private member.
class Celsius {
  constructor(public value: number) {}
}
class Fahrenheit {
  constructor(public value: number) {}
}
const c: Celsius = new Fahrenheit(212);
console.log("structural classes mix:", c.value);

class SafeCelsius {
  #kind = "C";
  constructor(public value: number) {}
}
class SafeFahrenheit {
  #kind = "F";
  constructor(public value: number) {}
}
// @ts-expect-error A #private field makes the class nominal.
const sc: SafeCelsius = new SafeFahrenheit(212);
console.log(new SafeCelsius(100) instanceof SafeCelsius);`,
      },
    ],
  },
];

export default augments;
