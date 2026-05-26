export interface PromptScenarioDef {
  slug: string;
  title: string;
  description: string;
  objective: string;
  expectedTraits: {
    keywords: string[];
    format: string;
    constraints: string[];
  };
  difficulty: "beginner" | "intermediate" | "advanced";
  category: "code-generation" | "debugging" | "api-design" | "data-analysis" | "system-design" | "documentation";
  estimatedMinutes: number;
  rubricWeights: {
    clarity: number;
    specificity: number;
    efficiency: number;
    context: number;
    constraints: number;
    edgeCases: number;
  };
}

export const BUILTIN_SCENARIOS: PromptScenarioDef[] = [
  {
    slug: "css-responsive-grid",
    title: "CSS Grid Responsive Card Grid",
    difficulty: "beginner",
    category: "code-generation",
    estimatedMinutes: 8,
    description: "Write a prompt to instruct an AI assistant to build a highly responsive, modern product card grid layout using modern CSS Grid and Flexbox. The cards should showcase product items, featuring high-quality glassmorphism container aesthetics and a clean mobile-first layout structure.",
    objective: "Write a detailed prompt to instruct the AI to:\n1. Rebuild a legacy layout using CSS Grid for responsive rows (1 column on mobile, 2 on tablet, 3-4 on desktop).\n2. Use Flexbox inside each card to vertically align product photos, pricing, and buy buttons.\n3. Add visual micro-animations: a subtle zoom or lift effect on hover.\n4. Apply glassmorphism styling tokens (backdrop filter blur, subtle borders, deep shadows) for premium appeal.\n5. Enforce accessibility: ARIA roles, clean heading structure, contrast-safe font pairings.",
    expectedTraits: {
      keywords: ["CSS Grid", "Flexbox", "responsive", "media queries", "glassmorphism", "hover transition", "accessibility", "mobile-first"],
      format: "Clean, commented CSS stylesheet and companion standard HTML structure",
      constraints: ["No absolute positioning for responsive layout structure", "Must use CSS Custom Properties for colors and spacing scale"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "react-auth-hooks",
    title: "React Custom Hooks for Auth Flow",
    difficulty: "intermediate",
    category: "code-generation",
    estimatedMinutes: 12,
    description: "Write a prompt to guide an AI to generate a complete React custom hook (`useAuth`) that encapsulates JWT authentication state management, local storage syncing, login/logout operations, and session expiration checks.",
    objective: "Create a detailed prompt that directs the AI to write a robust hook including:\n1. State fields: `isAuthenticated`, `user` profile, `token`, and `loading` statuses.\n2. Functions: `login(email, password)` mock API executor, `logout()`, and `refreshSession()`.\n3. Side effects: automatically synchronizing token state into `localStorage` on change and checking token expiration via an interval timer.\n4. Return helper headers for fetch requests: `getAuthHeaders()` to easily inject bearer tokens into API requests.\n5. Full TypeScript: fully typed parameters, return states, and custom interfaces.",
    expectedTraits: {
      keywords: ["custom hook", "JWT", "localStorage", "useAuth", "useEffect", "useState", "TypeScript", "expiration", "bearer token"],
      format: "A fully typed React custom hook file in TypeScript (.ts or .tsx)",
      constraints: ["Must handle initial render checks (sync with localStorage)", "Must avoid memory leaks in the expiration timer cleanup"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "react-comments-tree",
    title: "Accessible Nested Comments Tree",
    difficulty: "intermediate",
    category: "code-generation",
    estimatedMinutes: 12,
    description: "Write a prompt to guide an AI assistant in building a recursive nested comments section component in React/TypeScript. The component needs to support unlimited nesting depth, collapsing/expanding comment trees, adding replies, and keyboard navigation.",
    objective: "Formulate a prompt instructing the AI to create a comments tree that:\n1. Employs recursive component self-rendering to present multi-level nested replies safely.\n2. Manages dynamic UI collapsing/expanding states per sub-tree thread.\n3. Integrates mock state modifiers to append new replies to specific nested comment IDs.\n4. Ensures full keyboard accessibility (tab-index loops, space/enter triggers for action buttons) and screen reader friendly labels.",
    expectedTraits: {
      keywords: ["recursive component", "TypeScript", "nested comment", "state update", "collapsible", "accessibility", "ARIA", "keyboard navigation"],
      format: "A single React TSX component file with clean styling",
      constraints: ["Must support unlimited nesting without crashing or breaking visual boundaries", "Must type-check successfully in TypeScript"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "carousel-perf-optimizer",
    title: "Frontend Image Carousel Performance",
    difficulty: "advanced",
    category: "debugging",
    estimatedMinutes: 15,
    description: "Below is a buggy and unoptimized React image carousel. It causes severe layout shifts, locks the main thread during navigation because of unmemoized computations, and wastes network bandwidth by loading massive, high-res images eagerly.\n\n```tsx\nimport React, { useState } from 'react';\n\nexport default function BadCarousel({ images }) {\n  const [index, setIndex] = useState(0);\n  \n  const expensiveFilteredList = () => {\n    // Simulation of heavy metadata mapping on every single render\n    return images.map(img => ({ ...img, score: Math.random() }));\n  };\n  \n  const items = expensiveFilteredList();\n  \n  return (\n    <div className=\"carousel\">\n      <img src={items[index].url} className=\"big-image\" />\n      <div className=\"previews\">\n        {items.map((item, idx) => (\n          <img key={idx} src={item.url} onClick={() => setIndex(idx)} />\n        ))}\n      </div>\n    </div>\n  );\n}\n```\n\nWrite a prompt to instruct an AI assistant to identify the performance bottlenecks, explain them, and refactor the component for high performance.",
    objective: "Write a detailed prompt to instruct the AI to:\n1. Identify and explain the performance issues: layout shift (lack of height/width aspect ratios), lack of image lazy loading, unmemoized list processing, and thread blockage.\n2. Refactor using React `useMemo` to cache list computations, and lazy loading triggers using `loading=\"lazy\"` or custom `IntersectionObserver` placeholders.\n3. Fix layout shifts by specifying explicit aspect ratio controls.\n4. Add high-performance features: pre-fetching the next slide in sequence, and supporting fluid swipe gesture animations.",
    expectedTraits: {
      keywords: ["useMemo", "lazy loading", "layout shift", "CLS", "aspect-ratio", "pre-fetching", "IntersectionObserver", "refactor", "optimization"],
      format: "Detailed technical analysis followed by a production-ready React TSX component",
      constraints: ["Must eliminate layout shifts completely", "Must cache expensive operations across active renders"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "form-val-refactor",
    title: "Legacy Form to Zod & React Hook Form",
    difficulty: "beginner",
    category: "code-generation",
    estimatedMinutes: 10,
    description: "Write a prompt instructing an AI front-end developer to refactor a messy legacy HTML form with inline imperative JavaScript validation into a modern React component utilizing React Hook Form, Zod validation schemas, and Tailwind CSS.",
    objective: "Direct the AI to convert the legacy form to:\n1. A modular React component utilizing `react-hook-form` for form state management.\n2. A clear declarative validation schema powered by `zod` mapping email format, password strength boundaries, and matching confirmations.\n3. Responsive, beautiful styles using Tailwind CSS utility classes, with dynamic colored borders representing valid/invalid states.\n4. Clear, accessible inline error messages next to fields upon blur or submit operations.",
    expectedTraits: {
      keywords: ["react-hook-form", "zod", "validation schema", "Tailwind CSS", "refactoring", "accessibility", "error state", "input validation"],
      format: "A modular React TSX component with imports for Zod and React Hook Form",
      constraints: ["Must handle disabled loading states on submission", "Must validate matching passwords in the schema"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "motion-hover-cards",
    title: "Framer Motion Hover Cards",
    difficulty: "intermediate",
    category: "code-generation",
    estimatedMinutes: 10,
    description: "Write a prompt instructing an AI to create a beautiful interactive grid of feature cards utilizing Framer Motion. The cards should have 3D tilt hover effects, stagger fade-in entry animations, and smooth dynamic transitions.",
    objective: "Formulate a prompt instructing the AI to:\n1. Build an interactive grid component using Framer Motion animations.\n2. Design staggered entrance animation offsets so that cards fade and slide up sequentially on load.\n3. Configure premium 3D tilt interactive animations on hover, plus click/tap scaling dynamic feedback.\n4. Implement smooth transitions utilizing Spring physics configurations (tension, friction, mass parameters) for realistic spring feel.",
    expectedTraits: {
      keywords: ["Framer Motion", "stagger animation", "3D tilt hover", "Spring physics", "transitions", "micro-interactions", "Tailwind CSS", "TypeScript"],
      format: "Interactive React TSX component leveraging Framer Motion library",
      constraints: ["Must configure physics properties for smooth spring animations", "Must be responsive and clean across all screens"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "infinite-scroll-search",
    title: "Debounced Infinite Scroll Search",
    difficulty: "intermediate",
    category: "code-generation",
    estimatedMinutes: 12,
    description: "Write a prompt instructing an AI assistant to build an infinite scroll search interface. The UI must fetch movie records from an endpoint as the user scrolls, implementing input debouncing, loading/error states, and scroll virtualization.",
    objective: "Guide the AI to create an infinite search layout that:\n1. Implements input search debouncing via a custom hook (`useDebounce`) to avoid overloading API endpoints on rapid key inputs.\n2. Employs `IntersectionObserver` to trigger incremental page loads as the user reaches the list footer.\n3. Integrates proper skeleton loaders and handles network failure recovery elegantly.\n4. Virtualizes large data lists to keep DOM nodes minimal and avoid memory leaks.",
    expectedTraits: {
      keywords: ["IntersectionObserver", "debouncing", "infinite scroll", "skeleton loader", "API fetch", "list virtualization", "useDebounce", "state management"],
      format: "Complete React component with customizable debounce durations",
      constraints: ["Must cancel pending fetch requests on new inputs", "Must provide visual feedback during api retrieval errors"]
    },
    rubricWeights: {
      clarity: 20,
      specificity: 20,
      efficiency: 15,
      context: 15,
      constraints: 15,
      edgeCases: 15
    }
  },
  {
    slug: "design-system-configurator",
    title: "Design System & Theme Tokens Configurator",
    difficulty: "advanced",
    category: "system-design",
    estimatedMinutes: 15,
    description: "Write a prompt directing an AI systems engineer to architect a theme-switching engine for a enterprise design system. The system needs to support runtime customization of design tokens, nested theme overrides, and color contrast validation (WCAG compliance).",
    objective: "Create a detailed prompt instructing the AI to design a system with:\n1. Global Context and Theme provider in React managing global token variables (colors, spacing scales, fonts, shadows).\n2. Dynamic injection of CSS variables to the document root to update theme values at runtime.\n3. Nested theme overrides allowing specific page sections (like a card or header sidebar) to declare their own micro-themes.\n4. Programmatic accessibility contrast ratio checking (WCAG 2.1 AAA compliance verification checks on color pairings).",
    expectedTraits: {
      keywords: ["design system", "design tokens", "CSS variables", "context provider", "nested theme", "WCAG compliance", "contrast ratio", "accessibility", "tokens configurator"],
      format: "Technical architecture plan and implementation code for React",
      constraints: ["Must handle light/dark mode overrides elegantly", "Must run color contrast checks programmatically on color updates"]
    },
    rubricWeights: {
      clarity: 15,
      specificity: 20,
      efficiency: 15,
      context: 20,
      constraints: 15,
      edgeCases: 15
    }
  }
];
