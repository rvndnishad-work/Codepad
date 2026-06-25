import type { AngularAugment } from "./angular-augments.types";

const augments: AngularAugment[] = [
  {
    title: "What is runInInjectionContext and when do you need to use it?",
    answer: `**Core concept.** **<code>runInInjectionContext</code>** is an utility function that executes a callback function inside a specified injector context. It allows the callback to call **<code>inject()</code>** or create signal effects dynamically outside the default class construction lifecycle (e.g., in asynchronous callbacks, event handlers, or custom lifecycle methods).

**How it works.** By default, Angular restricts the use of <code>inject()</code> to "injection contexts" (like field initializers or constructor scopes). When you need to resolve dependencies inside async operations, you pass the callback and the target <code>EnvironmentInjector</code> / <code>Injector</code> reference to <code>runInInjectionContext()</code>.

> **Interview tip:** A common use case is creating an Angular Signal <code>effect()</code> dynamically or dynamically resolving a service when a button is clicked. You must inject the <code>EnvironmentInjector</code> in the constructor first, and then pass it to <code>runInInjectionContext</code> in your click handler.`,
    examples: [
      {
        label: "Executing inject() inside an asynchronous click event handler",
        tech: "angular",
        runnable: false,
        code: `import { Component, Injector, runInInjectionContext, inject } from '@angular/core';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-dynamic-logger',
  standalone: true,
  template: '<button (click)="logClickEvent()">Log Action</button>'
})
export class DynamicLoggerComponent {
  private injector = inject(Injector);

  logClickEvent() {
    runInInjectionContext(this.injector, () => {
      const analytics = inject(AnalyticsService);
      analytics.send('button_click', { time: Date.now() });
    });
  }
}`
      }
    ]
  },
  {
    title: "Explain how to perform unit testing on components with Signals using TestBed.",
    answer: `**Core concept.** Testing signal-based components is direct and synchronous. You mutate the signal state in your test using <code>.set()</code> or <code>.update()</code>, then call **<code>fixture.detectChanges()</code>** to force Angular's change detection engine to execute and render the changes to the DOM.

**How it works.**
- Signals do not require Zone.js to propagate template updates during tests.
- When testing **<code>effect()</code>** blocks, you should call **<code>fixture.destroy()</code>** or rely on **<code>TestBed.flushEffects()</code>** (if testing in environment contexts) to ensure side effects are processed.

### Signal Testing API Calls
| Scenario | Code Action | Purpose |
| --- | --- | --- |
| Mutate input signal | <code>myCompRef.mySignalInput.set(val)</code> | Simulates dynamic parent-binding changes |
| Verify computed value | <code>expect(myComp.computedValue()).toBe(val)</code> | Asserts derived math or string manipulation |
| Flush Side Effects | <code>fixture.detectChanges()</code> | Renders changes and triggers effects |

> **Interview tip:** Emphasize that testing signals is cleaner than legacy observables since there is no async subscription lifecycle to manage or mock in the test spec. Everything works synchronously.`,
    examples: [
      {
        label: "Unit test for a signal-based calculator component",
        tech: "angular",
        runnable: false,
        code: `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component, computed } from '@angular/core';

@Component({
  selector: 'app-calc',
  template: '<span id="total">{{ total() }}</span>'
})
class CalcComponent {
  x = signal(10);
  y = signal(20);
  total = computed(() => this.x() + this.y());
}

describe('CalcComponent', () => {
  let fixture: ComponentFixture<CalcComponent>;
  let component: CalcComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(CalcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should calculate computed totals reactively', () => {
    expect(component.total()).toBe(30);

    component.x.set(100);
    fixture.detectChanges();

    const text = fixture.nativeElement.querySelector('#total').textContent;
    expect(text).toBe('120');
  });
});`
      }
    ]
  },
  {
    title: "How do you mock services in Angular unit tests using Jasmine/Jest spies?",
    answer: `**Core concept.** Mocking services isolates components from their external dependencies (like API calls or storage). In Jasmine, you create mock interfaces with <code>jasmine.createSpyObj('Name', ['methods'])</code>. You then swap the real provider in the <code>TestBed</code> configuration using <code>{ provide: RealService, useValue: mockSpy }</code>.

**Why mock services?**
- Prevents actual network HTTP requests during test execution.
- Allows control over return values to test both success and failure (error) paths.
- Accelerates test execution speeds significantly.

> **Interview tip:** Be ready to write out the basic structure: define the spy variable, register it inside <code>providers</code>, and use <code>spy.method.and.returnValue(of(mockData))</code> to stub the return value before triggerring testing actions.`,
    examples: [
      {
        label: "Testing a component by mocking its HTTP service dependency",
        tech: "angular",
        runnable: false,
        code: `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserProfileComponent } from './user-profile.component';
import { DataService } from './data.service';

describe('UserProfileComponent', () => {
  let fixture: ComponentFixture<UserProfileComponent>;
  let component: UserProfileComponent;
  let mockDataService: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    mockDataService = jasmine.createSpyObj('DataService', ['getUserProfile']);

    await TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [
        { provide: DataService, useValue: mockDataService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
  });

  it('should render user details from mock backend service', () => {
    mockDataService.getUserProfile.and.returnValue(of({ id: 1, name: 'Spy User' }));

    fixture.detectChanges();

    const p = fixture.nativeElement.querySelector('p');
    expect(p.textContent).toContain('Spy User');
  });
});`
      }
    ]
  },
  {
    title: "What is the fixture.detectChanges() method in Angular testing, and when should you call it?",
    answer: `**Core concept.** **<code>fixture.detectChanges()</code>** forces Angular's change detection engine to evaluate the template bindings and run lifecycle hooks (like <code>ngOnInit</code>) on the component being tested. Because unit tests do not run inside the default Zone.js auto-trigger context, you must call this method manually after modifying any component state to update the rendered HTML.

**When to call it:**
1. **Initially:** Immediately inside the <code>beforeEach</code> block to trigger compilation and run <code>ngOnInit</code>.
2. **After updates:** Every time you modify variables, set signals, or trigger child events in your test assertions.
3. **Before query selectors:** Always call <code>detectChanges()</code> before querying the DOM (<code>fixture.nativeElement.querySelector</code>) to ensure you inspect up-to-date HTML.

> **Interview tip:** Note that calling <code>fixture.detectChanges()</code> is the testing equivalent to a change detection loop. Mention that you should call it *after* setting up mocks or spies, but *before* you test components' dynamic UI conditions.`,
    examples: [
      {
        label: "Calling detectChanges() during state assertions",
        tech: "angular",
        runnable: false,
        code: `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

@Component({
  template: '<div id="box" [class.active]="isActive">Box</div>'
})
class ToggleComponent {
  isActive = false;
}

describe('ToggleComponent', () => {
  it('should render correct class bindings on detectChanges', () => {
    const fixture = TestBed.createComponent(ToggleComponent);
    const comp = fixture.componentInstance;

    fixture.detectChanges();
    let div = fixture.nativeElement.querySelector('#box');
    expect(div.classList.contains('active')).toBeFalse();

    comp.isActive = true;
    expect(div.classList.contains('active')).toBeFalse();

    fixture.detectChanges();
    expect(div.classList.contains('active')).toBeTrue();
  });
});`
      }
    ]
  },
  {
    title: "What is ComponentFixtureAutoDetect and how does it affect unit tests?",
    answer: `**Core concept.** **<code>ComponentFixtureAutoDetect</code>** is a dependency provider token that configures <code>TestBed</code> to automatically execute change detection when asynchronous tasks (like promises or timers) resolve. While it reduces the need to call manual <code>fixture.detectChanges()</code>, it does **not** capture synchronous property mutations.

### AutoDetect vs Manual
| Feature | ComponentFixtureAutoDetect | Manual detectChanges() |
| --- | --- | --- |
| Async events | Auto-triggers change detection | Must be called manually |
| Synchronous variable updates | Ignored (requires manual call) | Fully processed |
| Test predictability | Lower (renders dynamically) | Higher (fully deterministic) |

> **Interview tip:** Point out that because <code>ComponentFixtureAutoDetect</code> ignores synchronous writes (e.g. <code>comp.value = 'new'</code>), most production test suites avoid it and prefer explicit, manual <code>fixture.detectChanges()</code> calls to keep test behaviors highly predictable.`,
    examples: [
      {
        label: "Configuring ComponentFixtureAutoDetect inside TestBed providers",
        tech: "angular",
        runnable: false,
        code: `import { TestBed, ComponentFixtureAutoDetect } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent AutoDetect', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true }
      ]
    });
  });

  it('should process async clicks without manual detectChanges', () => {
    const fixture = TestBed.createComponent(MyComponent);
    const btn = fixture.nativeElement.querySelector('button');
    
    btn.click();
    expect(fixture.nativeElement.querySelector('.result').textContent).not.toBeEmpty();
  });
});`
      }
    ]
  },
  {
    title: "What is the difference between fakeAsync, tick, and waitForAsync in Angular unit tests?",
    answer: `**Core concept.** <code>fakeAsync</code> and <code>waitForAsync</code> are utilities for testing asynchronous code. **<code>fakeAsync</code>** runs the test in a synchronous-looking wrapper that intercepts microtasks (promises) and macrotasks (timers) and controls time manually using the **<code>tick(ms)</code>** function. **<code>waitForAsync</code>** runs the test in a real async zone and requires calling <code>fixture.whenStable()</code> to wait for async events.

### fakeAsync vs waitForAsync
| Metric | fakeAsync | waitForAsync |
| --- | --- | --- |
| Time Control | Manual (<code>tick(ms)</code>) | Real clock timers |
| Syntax | Linear / Synchronous | Promises / Callback structure (<code>whenStable()</code>) |
| Real HTTP Support| No (unsupported in fake zone) | Yes |
| Recommendation | Recommended standard | Legacy or real integrations |

> **Interview tip:** State clearly that <code>fakeAsync</code> is preferred because it makes tests look synchronous, eliminating nested callback chains. Point out that <code>tick()</code> shifts simulated time forward, and <code>flush()</code> runs all remaining tasks in the queue.`,
    examples: [
      {
        label: "Comparing fakeAsync and waitForAsync syntax",
        tech: "angular",
        runnable: false,
        code: `import { fakeAsync, tick, waitForAsync, TestBed } from '@angular/core/testing';
import { MyAsyncService } from './my-async.service';

it('should test timers synchronously using fakeAsync', fakeAsync(() => {
  let value = false;
  setTimeout(() => { value = true; }, 1000);

  expect(value).toBeFalse();
  tick(1000);
  expect(value).toBeTrue();
}));`
      }
    ]
  },
  {
    title: "How do you build a custom form control by implementing the ControlValueAccessor interface?",
    answer: `**Core concept.** The **<code>ControlValueAccessor</code> (CVA)** interface acts as a bridge between a custom component (e.g. a toggle, rating bar, or slider) and the Angular Reactive Forms API. Implementing this interface allows your custom UI element to bind using standard directives like <code>formControlName</code> or <code>[(ngModel)]</code>.

**How it works.** You must implement four core methods:
1. **<code>writeValue(value)</code>:** Invoked when the form model writes a value down to the custom UI element.
2. **<code>registerOnChange(fn)</code>:** Receives a callback function that you must execute whenever the custom component's value changes in the UI (notifies the form group).
3. **<code>registerOnTouched(fn)</code>:** Receives a callback function to execute when the user interacts and leaves the element (triggers validation check).
4. **<code>setDisabledState(isDisabled)</code>:** Optional hook invoked when the parent form group changes state to disabled.

> **Interview tip:** Remind the interviewer that you must register your custom component as a provider of <code>NG_VALUE_ACCESSOR</code> using the <code>multi: true</code> attribute so the Forms API identifies it.`,
    examples: [
      {
        label: "Implementing a custom star-rating form control",
        tech: "angular",
        runnable: false,
        code: `import { Component, Provider, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const STAR_PROVIDER: Provider = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => StarRatingComponent),
  multi: true
};

@Component({
  selector: 'app-star-rating',
  standalone: true,
  providers: [STAR_PROVIDER],
  template: '<div class=\"stars\">' +
    '  @for (star of [1, 2, 3, 4, 5]; track star) {' +
    '    <span (click)=\"rate(star)\">{{ rating >= star ? \\'★\\' : \\'☆\\' }}</span>' +
    '  }' +
    '</div>'
})
export class StarRatingComponent implements ControlValueAccessor {
  rating = 0;
  onChange = (val: number) => {};
  onTouched = () => {};
  disabled = false;

  writeValue(value: number): void {
    this.rating = value || 0;
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void { this.disabled = isDisabled; }

  rate(val: number) {
    if (!this.disabled) {
      this.rating = val;
      this.onChange(val);
      this.onTouched();
    }
  }
}`
      }
    ]
  },
  {
    title: "What is the role of NG_VALUE_ACCESSOR in a custom component?",
    answer: `**Core concept.** **<code>NG_VALUE_ACCESSOR</code>** is a multi-provider InjectionToken used by Angular's forms engine to locate custom form controllers. When a template declares a <code>formControlName</code>, Angular queries the injector of the target element for any provider matching <code>NG_VALUE_ACCESSOR</code>. By registering your custom component under this token, you hook it into the forms system.

**Why use existing and multi?**
- **<code>useExisting</code>:** Points the token reference to your component instance, avoiding compiling a second class instance.
- **<code>multi: true</code>:** Allows registering multiple accessors in the registry without overwriting existing core inputs.

> **Interview tip:** Mention that <code>NG_VALUE_ACCESSOR</code> works similarly to interceptors: it uses <code>multi: true</code> to participate in a registry of injectors, allowing directives like <code>FormControlDirective</code> to connect to it.`,
    examples: [
      {
        label: "Registering NG_VALUE_ACCESSOR inside component metadata",
        tech: "angular",
        runnable: false,
        code: `import { Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true
    }
  ],
  template: '<input (input)="onInput($event)" />'
})
export class CustomInputComponent {
  onInput(event: Event) {
    // notify forms engine...
  }
}`
      }
    ]
  },
  {
    title: "Explain the difference between FormGroup.patchValue() and FormGroup.setValue().",
    answer: `**Core concept.** Both methods update form values, but **<code>setValue()</code>** is strict, requiring a full value object structure matching the Form Group exactly. **<code>patchValue()</code>** is lenient, accepting a partial object and updating only the matching keys while leaving the rest unchanged.

### setValue vs patchValue
| Metric | setValue() | patchValue() |
| --- | --- | --- |
| Object Matching | Strict (must match all form fields) | Loose (allows partial fields) |
| Missing Keys | Throws runtime error | Silently ignored |
| Use Case | Complete form resets/initializations | Incremental modifications |

> **Interview tip:** Cite <code>setValue()</code> as a safety feature. Because it checks for missing fields, it guarantees that you don't accidentally forget to initialize form components if the API model structure changes.`,
    examples: [
      {
        label: "Form value mutations using patchValue and setValue",
        tech: "angular",
        runnable: false,
        code: `import { FormGroup, FormControl } from '@angular/forms';

const form = new FormGroup({
  first: new FormControl(''),
  last: new FormControl(''),
  city: new FormControl('')
});

form.setValue({
  first: 'John',
  last: 'Doe',
  city: 'London'
});

form.patchValue({
  first: 'Jane'
});`
      }
    ]
  },
  {
    title: "How do you handle dynamic validation where one form field's validator depends on another field's value?",
    answer: `**Core concept.** Dynamic validation is handled by subscribing to a control's <code>valueChanges</code> observable. When changes occur, you dynamically call **<code>setValidators()</code>** or **<code>clearValidators()</code>** on the dependent control, followed by **<code>updateValueAndValidity()</code>** to force validation states to recalculate.

### Flow of Dependent Validation
1. Listen to parent changes: <code>parent.valueChanges.subscribe(...)</code>
2. Add/Remove rules: <code>child.setValidators([Validators.required])</code>
3. Recalculate states: <code>child.updateValueAndValidity()</code>

> **Interview tip:** Emphasize the importance of calling <code>updateValueAndValidity()</code>. Without this execution, the validation state will not refresh on the screen until the user manually modifies the child input field.`,
    examples: [
      {
        label: "Dynamic validation setup inside component constructor",
        tech: "angular",
        runnable: false,
        code: `import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: '...'
})
export class BookingComponent implements OnInit {
  private fb = inject(FormBuilder);
  
  form = this.fb.group({
    method: ['email'],
    email: ['', Validators.email],
    phone: ['']
  });

  ngOnInit() {
    this.form.get('method')?.valueChanges.subscribe(method => {
      const emailCtrl = this.form.get('email');
      const phoneCtrl = this.form.get('phone');

      if (method === 'phone') {
        phoneCtrl?.setValidators([Validators.required]);
        emailCtrl?.clearValidators();
      } else {
        emailCtrl?.setValidators([Validators.required, Validators.email]);
        phoneCtrl?.clearValidators();
      }

      phoneCtrl?.updateValueAndValidity();
      emailCtrl?.updateValueAndValidity();
    });
  }
}`
      }
    ]
  },
  {
    title: "What is the purpose of updateOn in Reactive Forms?",
    answer: `**Core concept.** **<code>updateOn</code>** is a configuration property that controls when validation and value updates propagate through FormControls. By default, it updates on every keystroke (<code>'change'</code>). Changing it to <code>'blur'</code> or <code>'submit'</code> defer validation checks until focus is lost or the form is submitted.

### updateOn Configurations
- **<code>'change'</code> (Default):** Propagates value and validation status instantly on every input stroke.
- **<code>'blur'</code>:** Propagates only when the user shifts focus away from the input element. Great for server validation (e.g. checking unique usernames).
- **<code>'submit'</code>:** Propagates only when the parent form element triggers a submit event. Best for performance-intensive forms.

> **Interview tip:** Frame <code>updateOn: 'blur'</code> as a performance optimization. If you have async validators checking username availability against a backend API, setting <code>updateOn</code> to <code>'blur'</code> prevents firing duplicate API requests during typing.`,
    examples: [
      {
        label: "Enabling blur-based updates for a form input",
        tech: "angular",
        runnable: false,
        code: `import { FormGroup, FormControl } from '@angular/forms';

const form = new FormGroup({
  username: new FormControl('', {
    updateOn: 'blur',
    validators: []
  }),
  password: new FormControl('', {
    updateOn: 'submit'
  })
});`
      }
    ]
  },
  {
    title: "What is the difference between take(1) and first() operators in RxJS?",
    answer: `**Core concept.** Both operators unsubscribe and complete the stream after emitting the first value. However, **<code>take(1)</code>** silently completes if the source stream completes without emitting anything. **<code>first()</code>** throws an <code>EmptyError</code> (error callback) if the stream terminates empty, unless a default value or filter predicate is supplied.

### take(1) vs first()
| Operator | Empty Stream Behavior | Supports Predicate Filter |
| --- | --- | --- |
| **<code>take(1)</code>** | Completes cleanly (silently) | No |
| **<code>first()</code>** | Throws <code>EmptyError</code> | Yes (e.g. <code>first(val => val > 10)</code>) |

> **Interview tip:** Use <code>take(1)</code> if you are fetching configuration parameters that might be optionally null. Use <code>first()</code> when you are expecting a mandatory value (like an HTTP response) and want to trigger error handling routines if the connection drops prematurely.`,
    examples: [
      {
        label: "Behavior differences on empty streams",
        tech: "angular",
        runnable: false,
        code: `import { EMPTY } from 'rxjs';
import { take, first } from 'rxjs/operators';

EMPTY.pipe(
  take(1)
).subscribe({
  next: val => console.log('Value:', val),
  complete: () => console.log('Completed cleanly!')
});

EMPTY.pipe(
  first()
).subscribe({
  next: val => console.log('Value:', val),
  error: err => console.log('Error caught:', err)
});`
      }
    ]
  },
  {
    title: "Explain the shareReplay operator in RxJS and how it prevents duplicate HTTP requests.",
    answer: `**Core concept.** The **<code>shareReplay()</code>** operator converts a **cold observable** (runs its execution path for each subscriber) into a **hot observable** (multicasts the same execution stream to all subscribers). It caches (replays) a specified number of emitted values, allowing subsequent subscribers to immediately retrieve the cached data without triggerring new execution flows.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Cold vs hot caching stream'>
  <rect class='d-box' x='20' y='60' width='100' height='50' rx='5'/>
  <text class='d-text' x='70' y='90' text-anchor='middle'>Cold Stream</text>
  <path class='d-edge' d='M 120 85 L 200 85' marker-end='url(#ah-sa)'/>
  <rect class='d-box-accent' x='200' y='60' width='110' height='50' rx='5'/>
  <text class='d-text' x='255' y='90' text-anchor='middle'>shareReplay(1)</text>

  <path class='d-edge-accent' d='M 310 75 L 380 45' marker-end='url(#ah-sa)'/>
  <path class='d-edge-accent' d='M 310 95 L 380 125' marker-end='url(#ah-sa)'/>
  
  <text class='d-sub' x='410' y='45' text-anchor='middle'>Sub A (Cached)</text>
  <text class='d-sub' x='410' y='125' text-anchor='middle'>Sub B (Cached)</text>
</svg>

**Typical use case:** If multiple independent components inject a config service and request application settings from the backend, applying <code>shareReplay(1)</code> to the HTTP request guarantees the server receives only one request.

> **Interview tip:** Be sure to state that you should configure the buffer size (usually <code>1</code>) and use <code>refCount: false</code> for persistent config caches, or <code>refCount: true</code> to auto-garbage collect the cache if all subscribers unsubscribe.`,
    examples: [
      {
        label: "Caching HTTP requests using shareReplay",
        tech: "angular",
        runnable: false,
        code: `import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  
  readonly appConfig$: Observable<any> = this.http.get('/api/config').pipe(
    shareReplay({ bufferSize: 1, refCount: false })
  );
}`
      }
    ]
  },
  {
    title: "What is the difference between forkJoin, zip, combineLatest, and withLatestFrom?",
    answer: `**Core concept.** These are RxJS joining operators that merge multiple observables into a single array or object, but they trigger updates and handle values differently.

### Operator Comparisons
| Operator | Emits When | Value Output |
| --- | --- | --- |
| **<code>forkJoin</code>** | All source observables **complete** | Final emitted values of each stream |
| **<code>combineLatest</code>** | Any source emits (after all have emitted at least once) | The latest values of all sources |
| **<code>zip</code>** | All sources emit their Nth value | Matches values by index pairs |
| **<code>withLatestFrom</code>** | The **primary** source emits | Primary value paired with auxiliary latest values |

> **Interview tip:** Cite <code>forkJoin</code> as the RxJS equivalent to <code>Promise.all</code>. Mention that <code>forkJoin</code> is ideal for firing multiple HTTP calls in parallel and waiting for all to complete. Warning: if any of the observables fails or never completes, <code>forkJoin</code> will not emit!`,
    examples: [
      {
        label: "Merger operations in action",
        tech: "angular",
        runnable: false,
        code: `import { forkJoin, combineLatest, of, timer } from 'rxjs';
import { map } from 'rxjs/operators';

const requestA = of('ConfigLoaded');
const requestB = timer(1000).pipe(map(() => 'UserProfileLoaded'));

forkJoin([requestA, requestB]).subscribe(val => console.log('forkJoin:', val));
combineLatest([requestA, requestB]).subscribe(val => console.log('combineLatest:', val));`
      }
    ]
  },
  {
    title: "How does catchError work in RxJS, and how do you return a fallback value?",
    answer: `**Core concept.** **<code>catchError</code>** intercepts error signals emitted by an observable stream. Instead of breaking the application, it allows you to recover gracefully by returning a new **replacement observable** (such as a fallback value or empty array), which completes the pipeline cleanly.

**Important rules:**
- If you catch an error and return <code>of(fallback)</code>, the stream completes cleanly. Subsequent emissions will not occur since error notifications close the source stream.
- If you need to re-throw the error, return <code>throwError(() =&gt; new Error(...))</code>.

> **Interview tip:** Highlight that <code>catchError</code> must be placed inside the <code>pipe</code> of the nested inner observable if you want the outer stream to stay active (e.g. during auto-complete searches where one network check fails).`,
    examples: [
      {
        label: "Graceful error recovery using catchError",
        tech: "angular",
        runnable: false,
        code: `import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-users',
  template: '<ul>@for (u of users; track u.id) { <li>{{ u.name }}</li> }</ul>'
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  users: any[] = [];

  ngOnInit() {
    this.http.get<any[]>('/api/faulty-users-endpoint')
      .pipe(
        catchError(error => {
          console.error('Request failed:', error);
          return of([]);
        })
      )
      .subscribe(data => this.users = data);
  }
}`
      }
    ]
  },
  {
    title: "Explain how you can bridge Signals and RxJS observables using toSignal() and toObservable().",
    answer: `**Core concept.** Angular 16 introduced interoperability helpers in <code>@angular/core/rxjs-interop</code> to bridge the gap between RxJS observables (for streams and asynchronous logic) and Signals (for state synchronization).
- **<code>toSignal(observable$)</code>:** Subscribes to an observable and turns it into a reactive Signal. It handles cleanup automatically on destroy.
- **<code>toObservable(signal)</code>:** Converts a Signal into an RxJS observable, emitting value changes inside an event loop.

### Bridge APIs
| Function | Direction | Requirement |
| --- | --- | --- |
| **<code>toSignal(obs$)</code>** | Observable -> Signal | Needs initial value or handles async undefined state |
| **<code>toObservable(sig)</code>** | Signal -> Observable | Must run inside active Injection Context |

> **Interview tip:** Be sure to emphasize that <code>toSignal</code> handles subscription teardown automatically. You do not need to unsubscribe manually, avoiding memory leak pitfalls.`,
    examples: [
      {
        label: "Interoperability between RxJS and Signals",
        tech: "angular",
        runnable: false,
        code: `import { Component, signal, inject } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-interop',
  standalone: true,
  template: '<p>User: {{ user()?.name }}</p>'
})
export class InteropComponent {
  private http = inject(HttpClient);

  user = toSignal(this.http.get<{ name: string }>('/api/user/1'), {
    initialValue: { name: 'Loading...' }
  });

  counter = signal(0);
  counter$ = toObservable(this.counter);

  constructor() {
    this.counter$.subscribe(val => console.log('Counter changed to:', val));
  }
}`
      }
    ]
  },
  {
    title: "What is the difference between @ViewChildren and @ViewChild?",
    answer: `**Core concept.** Both decorators query components, DOM elements, or directives inside the component's own template.
- **<code>@ViewChild</code>** matches and returns a single reference (the first match).
- **<code>@ViewChildren</code>** matches all instances and returns a dynamic RxJS-compatible **<code>QueryList</code>** wrapper. This list updates automatically whenever nodes are added or removed dynamically.

### ViewChild vs ViewChildren
| Metric | @ViewChild | @ViewChildren |
| --- | --- | --- |
| Return Type | <code>ElementRef</code> / Component class reference | <code>QueryList&lt;T&gt;</code> |
| Matches | First matching node only | All matching nodes |
| Dynamic Updates | No | Yes (via <code>QueryList.changes</code> observable) |

> **Interview tip:** Explain that queries are resolved *after* template initialization, meaning these references are undefined inside <code>ngOnInit</code> and become ready inside the <code>ngAfterViewInit</code> hook.`,
    examples: [
      {
        label: "Querying multiple template items using @ViewChildren",
        tech: "angular",
        runnable: false,
        code: `import { Component, ViewChildren, QueryList, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-list',
  standalone: true,
  template: '<div #item>Item A</div><div #item>Item B</div><div #item>Item C</div>'
})
export class ListComponent implements AfterViewInit {
  @ViewChildren('item') items!: QueryList<ElementRef>;

  ngAfterViewInit() {
    console.log('Total items matched:', this.items.length);

    this.items.changes.subscribe(changes => {
      console.log('List changed! New count:', changes.length);
    });
  }
}`
      }
    ]
  }
];

export default augments;
