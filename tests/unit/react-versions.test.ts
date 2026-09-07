import { describe, expect, it } from "vitest";
import {
  templates,
  REACT_VERSION,
  REACT_DOM_VERSION,
  REACT_SCRIPTS_VERSION,
  REACT_SANDBOX_DEPS,
  REACT_TEMPLATE_DEPS,
} from "@/lib/templates";

/**
 * Contract: every React sandbox in the app must resolve the repo's React
 * (19.2: useEffectEvent, <Activity>, `use`, …), never Sandpack's stale
 * built-in ^19.0.0 default. ShimmedSandpackProvider merges
 * REACT_TEMPLATE_DEPS for react-family templates and Playground forwards
 * each template's `dependencies` via customSetup — so the catalog entries
 * themselves must carry the pin.
 */
describe("react sandbox version pins", () => {
  it("tracks the app's own react version", () => {
    expect(REACT_VERSION).toBe("^19.2.8");
    expect(REACT_DOM_VERSION).toBe("^19.2.8");
    expect(REACT_SANDBOX_DEPS).toEqual({
      react: "^19.2.8",
      "react-dom": "^19.2.8",
      "react-scripts": REACT_SCRIPTS_VERSION,
    });
    expect(REACT_TEMPLATE_DEPS).toEqual({
      react: REACT_VERSION,
      "react-dom": REACT_DOM_VERSION,
    });
  });

  it("pins react/react-dom on every base:react template", () => {
    const reactTemplates = templates.filter((t) => t.base.startsWith("react"));
    // If this is empty the filter is wrong, not the catalog.
    expect(reactTemplates.length).toBeGreaterThan(0);
    for (const t of reactTemplates) {
      expect(
        t.dependencies?.react,
        `${t.id} must pin react (else Sandpack falls back to ^19.0.0)`
      ).toBe(REACT_VERSION);
      expect(
        t.dependencies?.["react-dom"],
        `${t.id} must pin react-dom (else Sandpack falls back to ^19.0.0)`
      ).toBe(REACT_DOM_VERSION);
    }
  });
});
