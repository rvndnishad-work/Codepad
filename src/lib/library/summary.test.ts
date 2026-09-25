import { describe, expect, it } from "vitest";
import { publicSummary } from "./summary";

describe("publicSummary", () => {
  it("uses the spoken question from a Question Body", () => {
    const body = '**Question presented to candidate:**\n"When you write `onClick={e => ...}`, what is that `e`?"\n\n**What a strong answer should cover:**\n- SyntheticEvent';
    expect(publicSummary(body)).toBe("When you write onClick={e => ...}, what is that e?");
  });

  it("strips markdown from other descriptions", () => {
    expect(publicSummary("## Closures\n\nExplain **closures** with an [example](https://x.dev).")).toBe("Closures Explain closures with an example.");
  });

  it("shortens long text and handles empty input", () => {
    expect(publicSummary("a ".repeat(200), 20)).toHaveLength(20);
    expect(publicSummary("   ")).toBeNull();
    expect(publicSummary(null)).toBeNull();
  });
});
