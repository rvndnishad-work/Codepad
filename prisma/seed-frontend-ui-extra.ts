import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Ui = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  estimatedMinutes: number;
  description: string;
  app: string;
  solution: string;
};

const UIS: Ui[] = [
  {
    slug: "fe-ui-temperature-converter",
    title: "Temperature Converter",
    difficulty: "easy",
    topics: ["state","forms"],
    estimatedMinutes: 15,
    description: `Build a **Temperature Converter** component.

**Requirements**
- Two inputs: one for Celsius, one for Fahrenheit.
- Typing in Celsius updates Fahrenheit, and vice versa.
- Use the formula: \`F = C * 9/5 + 32\` and \`C = (F - 32) * 5/9\`.
- Allow decimal inputs, but handle empty inputs gracefully (clearing the other input).`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Temperature Converter component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Temperature Converter</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [c, setC] = useState("");
  const [f, setF] = useState("");

  const handleC = (val) => {
    setC(val);
    if (val === "") {
      setF("");
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setF((num * 9 / 5 + 32).toFixed(2));
    }
  };

  const handleF = (val) => {
    setF(val);
    if (val === "") {
      setC("");
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setC(((num - 32) * 5 / 9).toFixed(2));
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 300, margin: "0 auto" }}>
      <h1>Temp Converter</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div>
          <label>Celsius</label>
          <input value={c} onChange={(e) => handleC(e.target.value)} type="number" style={{ width: "100%", padding: 8 }} />
        </div>
        <div>⇄</div>
        <div>
          <label>Fahrenheit</label>
          <input value={f} onChange={(e) => handleF(e.target.value)} type="number" style={{ width: "100%", padding: 8 }} />
        </div>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-calculator",
    title: "Calculator",
    difficulty: "medium",
    topics: ["state","events"],
    estimatedMinutes: 25,
    description: `Build a basic **Calculator** component.

**Requirements**
- Basic operations: Addition, Subtraction, Multiplication, Division.
- Buttons for numbers (0-9), operators (+, -, *, /), clear (C), and equal (=).
- Display current inputs and evaluation results safely.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Calculator component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Calculator</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [val, setVal] = useState("");

  const handlePress = (char) => {
    if (char === "=") {
      try {
        setVal(String(eval(val)));
      } catch {
        setVal("Error");
      }
    } else if (char === "C") {
      setVal("");
    } else {
      setVal(val + char);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 240, margin: "0 auto" }}>
      <h1>Calculator</h1>
      <input readOnly value={val} style={{ width: "100%", padding: 12, fontSize: 20, textAlign: "right", boxSizing: "border-box", marginBottom: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {["7","8","9","/" , "4","5","6","*" , "1","2","3","-" , "C","0","=","+"].map(btn => (
          <button key={btn} onClick={() => handlePress(btn)} style={{ padding: 12, fontSize: 16 }}>{btn}</button>
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-lazy-image",
    title: "Lazy Load Image",
    difficulty: "medium",
    topics: ["effects","intersection-observer"],
    estimatedMinutes: 25,
    description: `Build a **Lazy Loading Image** component.

**Requirements**
- Render a placeholder (e.g. low-res thumbnail or blur block) initially.
- Start fetching and rendering the high-res image only when the element enters the viewport.
- Clean up Observer registration correctly.`,
    app: `import { useState, useEffect, useRef } from "react";


export default function App() {
  // TODO: Implement Lazy Load Image component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Lazy Load Image</h1>
    </div>
  );
}
`,
    solution: `import { useState, useEffect, useRef } from "react";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Lazy Load Image</h1>
      <div style={{ height: "120vh" }}>Scroll down to trigger image loading...</div>
      <div ref={imgRef} style={{ width: 300, height: 200, background: "#e2e8f0", margin: "0 auto", borderRadius: 8, overflow: "hidden", display: "grid", placeItems: "center" }}>
        {loaded ? (
          <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809" alt="Lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "#64748b" }}>Loading on viewport arrival...</span>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-avatar-group",
    title: "Avatar Group",
    difficulty: "easy",
    topics: ["styling"],
    estimatedMinutes: 15,
    description: `Build a overlapping **Avatar Group**.

**Requirements**
- Accept a list of user image urls and a \`max\` display limit.
- Overflowing avatars must be represented by a single additional count badge (e.g. \`+3\` for 3 additional items).
- Hovering an avatar should elevate/scale it slightly for sleek feedback.`,
    app: `import { useState } from "react";

const USERS = ["A", "B", "C", "D", "E", "F"];

export default function App() {
  // TODO: Implement Avatar Group component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Avatar Group</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

const USERS = ["A", "B", "C", "D", "E", "F"];

export default function App() {
  const max = 3;
  const visible = USERS.slice(0, max);
  const extra = USERS.length - max;

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Avatar Group</h1>
      <div style={{ display: "inline-flex", flexDirection: "row" }}>
        {visible.map((u, i) => (
          <div
            key={i}
            style={{
              width: 40, height: 40, borderRadius: "50%", background: "#4f46e5", color: "#fff",
              display: "grid", placeItems: "center", border: "2px solid #fff",
              marginLeft: i > 0 ? -12 : 0, fontWeight: "bold",
              transition: "transform 200ms", cursor: "pointer",
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            {u}
          </div>
        ))}
        {extra > 0 && (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e2e8f0", color: "#475569", display: "grid", placeItems: "center", border: "2px solid #fff", marginLeft: -12, fontSize: 12, fontWeight: "bold" }}>
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-otp-input",
    title: "OTP Verification Input",
    difficulty: "medium",
    topics: ["state","refs","events"],
    estimatedMinutes: 25,
    description: `Build a 6-digit **OTP / Verification Code** Input panel.

**Requirements**
- Render 6 individual single-character text input inputs.
- Typing a number automatically triggers focus transition to the **next** sibling input field.
- Pressing \`Backspace\` on an empty cell must trigger focus shift to the **previous** sibling input.
- Support pasting values directly, populating all fields starting from index 0.`,
    app: `import { useState, useRef } from "react";


export default function App() {
  // TODO: Implement OTP Verification Input component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>OTP Verification Input</h1>
    </div>
  );
}
`,
    solution: `import { useState, useRef } from "react";

export default function App() {
  const [otp, setOtp] = useState(Array(6).fill(""));
  const inputs = useRef([]);

  const handleChange = (val, idx) => {
    if (isNaN(Number(val))) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);

    if (val && idx < 5) {
      inputs.current[idx + 1].focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputs.current[idx - 1].focus();
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>OTP Verification</h1>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
        {otp.map((num, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            value={num}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            maxLength={1}
            style={{ width: 40, height: 40, textAlign: "center", fontSize: 18 }}
          />
        ))}
      </div>
      <button onClick={() => setOtp(Array(6).fill(""))}>Clear</button>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-multi-step-form",
    title: "Multi-Step Form Wizard",
    difficulty: "medium",
    topics: ["forms","state"],
    estimatedMinutes: 30,
    description: `Build a **Multi-Step Form Wizard**.

**Requirements**
- 3 Steps: Personal Info, Contact details, Review.
- Next / Previous buttons to navigate. Validate step inputs before allowing progress.
- Final step shows all details; clicking Submit completes the wizard and displays a success alert.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Multi-Step Form Wizard component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Multi-Step Form Wizard</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "" });

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 320, margin: "0 auto" }}>
      <h1>Step {step} of 3</h1>
      {step === 1 && (
        <div>
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%", padding: 6 }} />
        </div>
      )}
      {step === 2 && (
        <div>
          <label>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: "100%", padding: 6 }} />
        </div>
      )}
      {step === 3 && (
        <div>
          <p><strong>Name:</strong> {form.name}</p>
          <p><strong>Email:</strong> {form.email}</p>
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {step > 1 && <button onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button onClick={() => alert("Submitted!")}>Submit</button>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-dual-range-slider",
    title: "Dual Range Price Slider",
    difficulty: "hard",
    topics: ["state","slider"],
    estimatedMinutes: 30,
    description: `Build a **Dual Range Slider** (Min/Max selectors).

**Requirements**
- Display two slider handles on a single track representing Min and Max thresholds (e.g. Price bounds).
- Dragging handles adjusts values independently, preventing Min from exceeding Max.
- Display current boundary values (e.g. \`$10 - $90\`).`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Dual Range Price Slider component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Dual Range Price Slider</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [min, setMin] = useState(20);
  const [max, setMax] = useState(80);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 300, margin: "0 auto", textAlign: "center" }}>
      <h1>Price Range</h1>
      <p style={{ fontSize: 20, fontWeight: "bold" }}>\${min} - \${max}</p>
      <div style={{ position: "relative", height: 8, background: "#ddd", borderRadius: 4, margin: "16px 0" }}>
        <input
          type="range" min="0" max="100" value={min}
          onChange={(e) => setMin(Math.min(Number(e.target.value), max - 1))}
          style={{ position: "absolute", left: 0, width: "100%", top: -4 }}
        />
        <input
          type="range" min="0" max="100" value={max}
          onChange={(e) => setMax(Math.max(Number(e.target.value), min + 1))}
          style={{ position: "absolute", left: 0, width: "100%", top: -4 }}
        />
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-collapsible-sidebar",
    title: "Collapsible Sidebar Menu",
    difficulty: "medium",
    topics: ["state","navigation"],
    estimatedMinutes: 20,
    description: `Build a **Collapsible Sidebar Menu** navigation drawer.

**Requirements**
- Include a drawer trigger button (e.g. Hamburger icon) toggling the panel open/closed.
- Drawer should slide in/out smoothly from the left edge of the page.
- Clicking outside the sidebar drawer should automatically close it.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Collapsible Sidebar Menu component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Collapsible Sidebar Menu</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Collapsible Sidebar</h1>
      <button onClick={() => setOpen(true)}>☰ Open Menu</button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50 }} onClick={() => setOpen(false)}>
          <div style={{ width: 200, height: "100%", background: "#fff", padding: 20, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)}>✕ Close</button>
            <ul style={{ listStyle: "none", padding: "20px 0" }}>
              <li style={{ padding: "8px 0" }}>Dashboard</li>
              <li style={{ padding: "8px 0" }}>Assessments</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-search-bar",
    title: "Search Bar with History",
    difficulty: "medium",
    topics: ["state","lists"],
    estimatedMinutes: 20,
    description: `Build a **Search Bar** with autocomplete query history.

**Requirements**
- Typing a query and pressing \`Enter\` runs search and pushes it to local history logs.
- Clicking history logs selects that query immediately.
- History logs can be individually removed.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Search Bar with History component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Search Bar with History</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState(["React", "TypeScript"]);

  const handleSearch = (e) => {
    if (e.key === "Enter" && query.trim()) {
      if (!history.includes(query.trim())) {
        setHistory([query.trim(), ...history]);
      }
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 300, margin: "0 auto" }}>
      <h1>Search</h1>
      <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleSearch} placeholder="Search..." style={{ width: "100%", padding: 8 }} />
      <div style={{ marginTop: 12 }}>
        <strong>Recent:</strong>
        {history.map((h) => (
          <div key={h} style={{ display: "flex", justifyContent: "space-between", padding: 4 }}>
            <span onClick={() => setQuery(h)} style={{ cursor: "pointer" }}>{h}</span>
            <button onClick={() => setHistory(history.filter(x => x !== h))} style={{ fontSize: 9 }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-nested-comments",
    title: "Nested Comments System",
    difficulty: "hard",
    topics: ["recursion","state","lists"],
    estimatedMinutes: 35,
    description: `Build a recursive **Nested Threaded Comments/Replies** system.

**Requirements**
- Render nested replies indented below their parent comment.
- Each comment has a Reply button which displays an inline input box to add a child reply.
- Support deleting individual comment nodes, which optionally deletes or orphans its sub-tree.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Nested Comments System component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Nested Comments System</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [comments, setComments] = useState([
    { id: 1, text: "Welcome to Codepad!", replies: [] },
  ]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <h1>Nested Comments</h1>
      {comments.map((c) => (
        <CommentNode key={c.id} comment={c} />
      ))}
    </div>
  );
}

function CommentNode({ comment }) {
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 12, marginTop: 8 }}>
      <p>{comment.text}</p>
      <button onClick={() => setReplyOpen(!replyOpen)} style={{ fontSize: 11 }}>Reply</button>
      {comment.replies.map(r => (
        <CommentNode key={r.id} comment={r} />
      ))}
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-color-picker",
    title: "Color Picker",
    difficulty: "easy",
    topics: ["state","styling"],
    estimatedMinutes: 15,
    description: `Build a **Color Picker** widget.

**Requirements**
- Show a color swatch block with a dynamic background color.
- Offer three range inputs (sliders) for Red, Green, and Blue (0 to 255).
- Display the current RGB and Hex values.
- Updating a slider dynamically alters the swatch background.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Color Picker component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Color Picker</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [r, setR] = useState(128);
  const [g, setG] = useState(128);
  const [b, setB] = useState(128);

  const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 320, margin: "0 auto", textAlign: "center" }}>
      <h1>Color Picker</h1>
      <div style={{ width: "100%", height: 120, background: hex, borderRadius: 8, marginBottom: 16 }} />
      <p style={{ fontWeight: "bold" }}>RGB: ({r}, {g}, {b}) · {hex.toUpperCase()}</p>
      <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
        <label>Red ({r}) <input type="range" min="0" max="255" value={r} onChange={(e) => setR(Number(e.target.value))} style={{ width: "100%" }} /></label>
        <label>Green ({g}) <input type="range" min="0" max="255" value={g} onChange={(e) => setG(Number(e.target.value))} style={{ width: "100%" }} /></label>
        <label>Blue ({b}) <input type="range" min="0" max="255" value={b} onChange={(e) => setB(Number(e.target.value))} style={{ width: "100%" }} /></label>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-analog-clock",
    title: "Analog Clock",
    difficulty: "medium",
    topics: ["effects","timers"],
    estimatedMinutes: 25,
    description: `Build a CSS-driven **Analog Clock** component.

**Requirements**
- Display the clock face with three hands: Hour, Minute, and Second.
- Hands must rotate dynamically based on the current system time.
- Updates must occur once per second, cleaning up active timers/intervals on unmount.`,
    app: `import { useState, useEffect } from "react";


export default function App() {
  // TODO: Implement Analog Clock component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Analog Clock</h1>
    </div>
  );
}
`,
    solution: `import { useState, useEffect } from "react";

export default function App() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hrs = time.getHours();
  const mins = time.getMinutes();
  const secs = time.getSeconds();

  const secDeg = (secs / 60) * 360;
  const minDeg = ((mins + secs / 60) / 60) * 360;
  const hrDeg = (((hrs % 12) + mins / 60) / 12) * 360;

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1>Analog Clock</h1>
      <div style={{ width: 200, height: 200, borderRadius: "50%", border: "4px solid #111", position: "relative", background: "#f8fafc" }}>
        {/* Hour Hand */}
        <div style={{ position: "absolute", top: "25%", left: "49%", width: "2%", height: "25%", background: "#111", transformOrigin: "bottom center", transform: \`rotate(\${hrDeg}deg)\` }} />
        {/* Minute Hand */}
        <div style={{ position: "absolute", top: "15%", left: "49%", width: "2%", height: "35%", background: "#666", transformOrigin: "bottom center", transform: \`rotate(\${minDeg}deg)\` }} />
        {/* Second Hand */}
        <div style={{ position: "absolute", top: "10%", left: "49.5%", width: "1%", height: "40%", background: "#ef4444", transformOrigin: "bottom center", transform: \`rotate(\${secDeg}deg)\` }} />
        {/* Center pin */}
        <div style={{ position: "absolute", top: "46%", left: "46%", width: "8%", height: "8%", borderRadius: "50%", background: "#ef4444" }} />
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-typewriter",
    title: "Typewriter Effect",
    difficulty: "easy",
    topics: ["effects","timers"],
    estimatedMinutes: 15,
    description: `Create a **Typewriter Effect** component.

**Requirements**
- Take a text string prop (or default string) and type it character by character on a timer.
- Offer customizable speed (ms per character).
- Clean up timers correctly on component unmount.`,
    app: `import { useState, useEffect } from "react";


export default function App() {
  // TODO: Implement Typewriter Effect component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Typewriter Effect</h1>
    </div>
  );
}
`,
    solution: `import { useState, useEffect } from "react";

export default function App() {
  const text = "Practice, perform, and land your next role.";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setTyped((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Typewriter</h1>
      <p style={{ fontSize: 24, fontWeight: "500", borderRight: "2px solid #111", display: "inline-block", paddingRight: 4 }}>
        {typed}
      </p>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-rating-bar",
    title: "Feedback Rating Bar",
    difficulty: "easy",
    topics: ["state","slider"],
    estimatedMinutes: 15,
    description: `Build an interactive **Feedback Rating Bar**.

**Requirements**
- A continuous range slider or rating line representing scores from \`1\` (Poor) to \`10\` (Excellent).
- Dragging the slider dynamically changes the rating value.
- Change color of status feedback depending on value (e.g. Red for 1-4, Yellow for 5-7, Green for 8-10).`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Feedback Rating Bar component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Feedback Rating Bar</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [rating, setRating] = useState(5);

  const getColor = () => {
    if (rating < 5) return "#ef4444";
    if (rating < 8) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 300, margin: "0 auto", textAlign: "center" }}>
      <h1>Rating Slider</h1>
      <p style={{ fontSize: 48, fontWeight: 700, color: getColor() }}>{rating}</p>
      <input type="range" min="1" max="10" value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ width: "100%" }} />
      <div style={{ display: "flex", justifyContent: "between", marginTop: 8, fontSize: 12, color: "#666" }}>
        <span>Poor (1)</span>
        <span style={{ marginLeft: "auto" }}>Excellent (10)</span>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-segmented-control",
    title: "Segmented Control",
    difficulty: "easy",
    topics: ["state","styling"],
    estimatedMinutes: 15,
    description: `Build a **Segmented Control** toggle component.

**Requirements**
- Multiple inline options. Clicking one selects it.
- Render a sliding background panel to smoothly transition the selected state marker (CSS translation/transition).`,
    app: `import { useState } from "react";

const OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly"];

export default function App() {
  // TODO: Implement Segmented Control component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Segmented Control</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

const OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly"];

export default function App() {
  const [selected, setSelected] = useState("Weekly");

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Segmented Control</h1>
      <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 4, borderRadius: 8, gap: 4 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: selected === opt ? "#fff" : "transparent",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: selected === opt ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 200ms ease"
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <p style={{ marginTop: 12 }}>Selected: {selected}</p>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-infinite-scroll",
    title: "Infinite Scroll",
    difficulty: "hard",
    topics: ["effects","intersection-observer"],
    estimatedMinutes: 30,
    description: `Build an **Infinite Scroll** list.

**Requirements**
- Render a list of items.
- When the user scrolls to the bottom of the list, load and append 10 more items dynamically.
- Use \`IntersectionObserver\` or scroll event triggers for bottom-of-page detection.`,
    app: `import { useState, useEffect, useRef } from "react";


export default function App() {
  // TODO: Implement Infinite Scroll component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Infinite Scroll</h1>
    </div>
  );
}
`,
    solution: `import { useState, useEffect, useRef } from "react";

export default function App() {
  const [items, setItems] = useState(Array.from({ length: 20 }, (_, i) => \`Item \${i + 1}\`));
  const loaderRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setItems((prev) => [
          ...prev,
          ...Array.from({ length: 10 }, (_, i) => \`Item \${prev.length + i + 1}\`)
        ]);
      }
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <h1>Infinite Scroll</h1>
      <div style={{ height: 300, overflowY: "auto", border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        {items.map((item, i) => (
          <div key={i} style={{ padding: 12, borderBottom: "1px solid #eee" }}>{item}</div>
        ))}
        <div ref={loaderRef} style={{ textAlign: "center", padding: 8, color: "#888", fontSize: 12 }}>
          Loading more...
        </div>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-breadcrumbs",
    title: "Breadcrumbs",
    difficulty: "easy",
    topics: ["routing","navigation"],
    estimatedMinutes: 15,
    description: `Build a **Breadcrumbs** navigation trail.

**Requirements**
- Take a list of path segments (e.g. \`['home', 'settings', 'profile']\`).
- Join segments with arrow separators \`>\` or \`/\`.
- The last segment must look inactive (current page), while the preceding ones act as active click targets.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Breadcrumbs component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Breadcrumbs</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [path, setPath] = useState(["home", "assessments", "take-home"]);

  const handleClick = (idx) => {
    setPath(path.slice(0, idx + 1));
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Breadcrumbs</h1>
      <nav style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        {path.map((segment, i) => (
          <span key={i} style={{ display: "flex", gap: 8 }}>
            {i > 0 && <span style={{ color: "#94a3b8" }}>/</span>}
            {i === path.length - 1 ? (
              <span style={{ color: "#64748b", fontWeight: "bold" }}>{segment}</span>
            ) : (
              <span onClick={() => handleClick(i)} style={{ color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }}>
                {segment}
              </span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-badge",
    title: "Badge / Notification Pill",
    difficulty: "easy",
    topics: ["styling"],
    estimatedMinutes: 15,
    description: `Build a **Badge / Notification Pill**.

**Requirements**
- An element (e.g. Inbox envelope icon) with a red badge pill in the upper-right corner displaying a count.
- If count is \`0\`, hide the badge.
- If count exceeds \`99\`, format it as \`99+\`.
- Include buttons to increase/decrease the count.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Badge / Notification Pill component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Badge / Notification Pill</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(5);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Notification Badge</h1>
      <div style={{ display: "inline-block", position: "relative", padding: 8, background: "#f1f5f9", borderRadius: 8, fontSize: 32, marginBottom: 12 }}>
        ✉️
        {count > 0 && (
          <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: "bold", padding: "2px 6px", borderRadius: 999 }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={() => setCount(Math.max(0, count - 1))}>-1</button>
        <button onClick={() => setCount(count + 1)}>+1</button>
        <button onClick={() => setCount(120)}>Set 120</button>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-tooltip",
    title: "Tooltip Widget",
    difficulty: "medium",
    topics: ["hover","styling"],
    estimatedMinutes: 20,
    description: `Build a **Tooltip** helper component.

**Requirements**
- When the mouse hovers over the trigger target text, render the tooltip overlay container.
- The tooltip position (Top, Bottom, Left, Right) must be customizable via props.
- Must close smoothly when the cursor leaves.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Tooltip Widget component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Tooltip Widget</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState("top");

  const offset = {
    top: { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8 },
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 8 },
    left: { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 8 },
    right: { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 8 },
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 60, textAlign: "center" }}>
      <h1>Tooltip</h1>
      <div style={{ marginBottom: 16 }}>
        {["top", "bottom", "left", "right"].map(pos => (
          <button key={pos} onClick={() => setPosition(pos)} style={{ padding: 4, marginRight: 4, textTransform: "capitalize" }}>{pos}</button>
        ))}
      </div>

      <div style={{ display: "inline-block", position: "relative" }}>
        <span
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          style={{ padding: 8, border: "2px dashed #6366f1", cursor: "help", borderRadius: 4 }}
        >
          Hover over me!
        </span>
        {visible && (
          <div style={{ position: "absolute", background: "#111", color: "#fff", fontSize: 11, padding: "6px 10px", borderRadius: 4, whiteSpace: "nowrap", ...offset[position] }}>
            This is a {position} tooltip!
          </div>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-combobox",
    title: "Combobox Search Select",
    difficulty: "hard",
    topics: ["state","filtering","accessibility"],
    estimatedMinutes: 30,
    description: `Build a searchable **Combobox / Select** input.

**Requirements**
- Clicking the select bar opens the list of choices.
- Typing filters options. Clicking an option selects it, sets the input text, and closes the dropdown.
- Allow clearing the selection via a clear (X) indicator button.`,
    app: `import { useState, useRef, useEffect } from "react";

const OPTIONS = ["React", "Angular", "Vue", "Svelte", "Solid", "Ember"];

export default function App() {
  // TODO: Implement Combobox Search Select component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Combobox Search Select</h1>
    </div>
  );
}
`,
    solution: `import { useState, useRef, useEffect } from "react";

const OPTIONS = ["React", "Angular", "Vue", "Svelte", "Solid", "Ember"];

export default function App() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  const filtered = OPTIONS.filter(opt => opt.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 300, margin: "0 auto" }}>
      <h1>Combobox</h1>
      <div style={{ position: "relative" }}>
        <input
          value={query || selected}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected("");
          }}
          placeholder="Select stack..."
          style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
        />
        {selected && (
          <button onClick={() => { setSelected(""); setQuery(""); }} style={{ position: "absolute", right: 8, top: 8, border: "none", background: "none", cursor: "pointer" }}>✕</button>
        )}
        {open && (
          <ul style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", margin: "4px 0 0 0", padding: 4, listStyle: "none", zIndex: 10 }}>
            {filtered.map((item) => (
              <li
                key={item}
                onClick={() => {
                  setSelected(item);
                  setQuery("");
                  setOpen(false);
                }}
                style={{ padding: 6, cursor: "pointer" }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-kanban-board",
    title: "Kanban Board",
    difficulty: "hard",
    topics: ["state","lists"],
    estimatedMinutes: 35,
    description: `Build a simple **Kanban Board** with columns (Todo, In Progress, Done).

**Requirements**
- Allow creating tickets inside any column.
- Include buttons or arrows on each ticket to shift it left/right to adjacent columns.
- Support deleting individual tickets.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Kanban Board component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Kanban Board</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Design homepage", status: "todo" },
    { id: 2, text: "Write core tests", status: "progress" },
  ]);

  const move = (id, nextStatus) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: nextStatus } : t));
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, display: "flex", gap: 16 }}>
      {["todo", "progress", "done"].map(col => (
        <div key={col} style={{ flex: 1, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <h3 style={{ textTransform: "capitalize" }}>{col}</h3>
          {tasks.filter(t => t.status === col).map(t => (
            <div key={t.id} style={{ background: "#fff", padding: 8, margin: "8px 0", borderRadius: 4, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <p>{t.text}</p>
              <div style={{ display: "flex", gap: 4 }}>
                {col !== "todo" && <button onClick={() => move(t.id, col === "done" ? "progress" : "todo")}>◀</button>}
                {col !== "done" && <button onClick={() => move(t.id, col === "todo" ? "progress" : "done")}>▶</button>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-password-generator",
    title: "Password Generator",
    difficulty: "medium",
    topics: ["state","generation"],
    estimatedMinutes: 25,
    description: `Build a **Password Generator** panel.

**Requirements**
- Select length (6 to 32) and toggle components: Uppercase, Lowercase, Numbers, Symbols.
- Clicking Generate creates a random password matching checked rules.
- Display a strength label (Weak/Medium/Strong) depending on selected complexity.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Password Generator component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Password Generator</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [length, setLength] = useState(12);
  const [nums, setNums] = useState(true);
  const [pass, setPass] = useState("");

  const generate = () => {
    let chars = "abcdefghijklmnopqrstuvwxyz";
    if (nums) chars += "0123456789";
    let generated = "";
    for (let i = 0; i < length; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPass(generated);
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 320, margin: "0 auto" }}>
      <h1>Password Gen</h1>
      <input readOnly value={pass} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <div style={{ display: "grid", gap: 6 }}>
        <label>Length ({length}) <input type="range" min="6" max="32" value={length} onChange={(e) => setLength(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={nums} onChange={(e) => setNums(e.target.checked)} /> Include Numbers</label>
        <button onClick={generate}>Generate</button>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-tag-input",
    title: "Tag Chip Input",
    difficulty: "medium",
    topics: ["lists","state"],
    estimatedMinutes: 25,
    description: `Build a **Tag Chip Input** box.

**Requirements**
- Typing a word and pressing \`Enter\` or \`,\` wraps it as a removable tag capsule/chip.
- Clicking the close icon (x) on a chip deletes that specific tag.
- Prevent duplicate tags from being added.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Tag Chip Input component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Tag Chip Input</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [tags, setTags] = useState(["react", "js"]);
  const [input, setInput] = useState("");

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        setTags([...tags, input.trim()]);
      }
      setInput("");
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 360, margin: "0 auto" }}>
      <h1>Tags</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, border: "1px solid #ddd", padding: 8, borderRadius: 8 }}>
        {tags.map((tag) => (
          <span key={tag} style={{ background: "#e2e8f0", padding: "2px 8px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            {tag}
            <span onClick={() => setTags(tags.filter(t => t !== tag))} style={{ cursor: "pointer", fontWeight: "bold" }}>✕</span>
          </span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Add tag..." style={{ border: "none", outline: "none", flex: 1 }} />
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-dark-mode-toggle",
    title: "Dark Mode Toggle",
    difficulty: "easy",
    topics: ["state","styling"],
    estimatedMinutes: 15,
    description: `Build a **Dark Mode Toggle**.

**Requirements**
- A switch button toggles class \`.dark\` or sets body attributes to trigger page theme transitions.
- Persist selected mode inside \`localStorage\` so it remains active on reload.`,
    app: `import { useState, useEffect } from "react";


export default function App() {
  // TODO: Implement Dark Mode Toggle component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Dark Mode Toggle</h1>
    </div>
  );
}
`,
    solution: `import { useState, useEffect } from "react";

export default function App() {
  const [dark, setDark] = useState(false);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, background: dark ? "#111" : "#fff", color: dark ? "#fff" : "#000", minHeight: "100vh", transition: "all 300ms" }}>
      <h1>Theme Toggle</h1>
      <button onClick={() => setDark(!dark)}>Toggle Theme</button>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-speed-dial",
    title: "Speed Dial Menu",
    difficulty: "medium",
    topics: ["state","styling"],
    estimatedMinutes: 20,
    description: `Build a floating **Speed Dial Floating Action Button**.

**Requirements**
- Main floating dial button stays anchored at bottom-right.
- Clicking or hovering triggers a stack of sub-action circular buttons to fan/expand upwards.
- Include clean slide/scale entry transition animations.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Speed Dial Menu component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Speed Dial Menu</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, minHeight: "100vh", position: "relative" }}>
      <h1>Speed Dial</h1>
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {open && (
          <>
            <button style={{ width: 40, height: 40, borderRadius: "50%", background: "#6366f1", color: "#fff", border: "none" }}>☎️</button>
            <button style={{ width: 40, height: 40, borderRadius: "50%", background: "#6366f1", color: "#fff", border: "none" }}>✉️</button>
          </>
        )}
        <button onClick={() => setOpen(!open)} style={{ width: 56, height: 56, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", fontSize: 24 }}>
          {open ? "✕" : "＋"}
        </button>
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-skeleton-loader",
    title: "Skeleton Card Loader",
    difficulty: "easy",
    topics: ["styling"],
    estimatedMinutes: 15,
    description: `Build a pulse-animated **Skeleton Loader Card** panel.

**Requirements**
- Mock standard user profiles/items containing an avatar, title block, and details body.
- While loading, render structural shapes with glowing background gradients that pulsate (\`animation: pulse 1.5s infinite\`).
- A toggle button switches between loading skeleton state and actual profile content.`,
    app: `import { useState } from "react";


export default function App() {
  // TODO: Implement Skeleton Card Loader component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Skeleton Card Loader</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

export default function App() {
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 300, margin: "0 auto", textAlign: "center" }}>
      <h1>Skeleton Loader</h1>
      <button onClick={() => setLoading(!loading)} style={{ marginBottom: 16 }}>
        Toggle Loading: {loading ? "Active" : "Done"}
      </button>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        {loading ? (
          <div style={{ animation: "pulse 1.5s infinite" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e2e8f0", margin: "0 auto 12px auto" }} />
            <div style={{ height: 16, background: "#e2e8f0", borderRadius: 4, width: "60%", margin: "0 auto 8px auto" }} />
            <div style={{ height: 12, background: "#e2e8f0", borderRadius: 4, width: "80%", margin: "0 auto" }} />
          </div>
        ) : (
          <div>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#4f46e5", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 12px auto", fontSize: 20 }}>👤</div>
            <h3>Alexis Jordan</h3>
            <p style={{ color: "#666", fontSize: 13 }}>Alexis is a fullstack web developer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-draw-board",
    title: "Canvas Sketch Drawing Board",
    difficulty: "hard",
    topics: ["effects","events","canvas"],
    estimatedMinutes: 35,
    description: `Build a **Drawing Board** component using HTML5 \`<canvas>\`.

**Requirements**
- Dragging with left-click draws freehand lines on the board.
- Include tools to select brush color (Red, Green, Blue, Black) and stroke size.
- A Clear button wipes the canvas cleanly.`,
    app: `import { useState, useRef, useEffect } from "react";


export default function App() {
  // TODO: Implement Canvas Sketch Drawing Board component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Canvas Sketch Drawing Board</h1>
    </div>
  );
}
`,
    solution: `import { useState, useRef, useEffect } from "react";

export default function App() {
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#000000");
  const drawingRef = useRef(false);

  const startDraw = (e) => {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Sketch Board</h1>
      <div style={{ marginBottom: 8 }}>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button onClick={clear} style={{ marginLeft: 8 }}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={() => drawingRef.current = false}
        onMouseLeave={() => drawingRef.current = false}
        style={{ border: "2px solid #ddd", background: "#f8fafc" }}
      />
    </div>
  );
}
`,
  },
  {
    slug: "fe-ui-memory-game",
    title: "Memory Card Match Game",
    difficulty: "hard",
    topics: ["state","game-logic"],
    estimatedMinutes: 35,
    description: `Build a **Memory Card Matching Game**.

**Requirements**
- 4x4 grid of cards (8 matching icon pairs, randomized on start).
- Click flips a card; clicking a second matches or flips both face down after a brief delay.
- Detect when all matches are found, and provide a Play Again reset button.`,
    app: `import { useState } from "react";

const CARDS = ["🍎", "🍌", "🍇", "🍊", "🍎", "🍌", "🍇", "🍊"];

export default function App() {
  // TODO: Implement Memory Card Match Game component
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Memory Card Match Game</h1>
    </div>
  );
}
`,
    solution: `import { useState } from "react";

const CARDS = ["🍎", "🍌", "🍇", "🍊", "🍎", "🍌", "🍇", "🍊"];

export default function App() {
  const [board, setBoard] = useState(CARDS);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  const handleFlip = (idx) => {
    if (flipped.length === 2 || matched.includes(idx)) return;
    const next = [...flipped, idx];
    setFlipped(next);

    if (next.length === 2) {
      if (board[next[0]] === board[next[1]]) {
        setMatched([...matched, ...next]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
      <h1>Memory Game</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 50px)", gap: 8, justifyContent: "center" }}>
        {board.map((item, i) => (
          <button
            key={i}
            onClick={() => handleFlip(i)}
            style={{ width: 50, height: 50, fontSize: 20 }}
          >
            {flipped.includes(i) || matched.includes(i) ? item : "❓"}
          </button>
        ))}
      </div>
    </div>
  );
}
`,
  },
];

async function main() {
  let created = 0;
  for (const u of UIS) {
    const tags = ["ui", "react", "frontend", ...u.topics];
    const starterFiles = JSON.stringify({ "/App.js": u.app });
    const referenceSolutionsJson = JSON.stringify({ "/App.js": u.solution });

    const challenge = await prisma.challenge.upsert({
      where: { slug: u.slug },
      update: {
        title: u.title,
        description: u.description,
        difficulty: u.difficulty,
        category: "Frontend UI",
        tags: JSON.stringify(tags),
        estimatedMinutes: u.estimatedMinutes,
        published: true,
        visibility: "public",
      },
      create: {
        slug: u.slug,
        title: u.title,
        description: u.description,
        difficulty: u.difficulty,
        template: "react",
        starterFiles,
        testFiles: "{}",
        category: "Frontend UI",
        tags: JSON.stringify(tags),
        estimatedMinutes: u.estimatedMinutes,
        published: true,
        visibility: "public",
      },
      select: { id: true },
    });

    await prisma.challengeStep.upsert({
      where: { challengeId_position: { challengeId: challenge.id, position: 0 } },
      update: {
        description: u.description,
        template: "react",
        estimatedMinutes: u.estimatedMinutes,
        judgingMode: "frontend",
        starterFiles,
        testFiles: "{}",
        referenceSolutionsJson,
      },
      create: {
        challengeId: challenge.id,
        position: 0,
        title: u.title,
        description: u.description,
        template: "react",
        starterFiles,
        testFiles: "{}",
        estimatedMinutes: u.estimatedMinutes,
        judgingMode: "frontend",
        referenceSolutionsJson,
      },
    });

    created++;
    console.log(`  ✓ ${u.slug} (${u.difficulty})`);
  }
  console.log(`\nSeeded ${created} additional frontend UI challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
