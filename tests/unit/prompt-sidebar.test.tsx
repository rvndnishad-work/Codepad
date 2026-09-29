import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PromptSidebar from "@/components/PromptSidebar";

const { store } = vi.hoisted(() => ({
  store: {
    activeFile: "/App.js",
    files: { "/App.js": { code: "const answer = 42;\n" } },
  },
}));

vi.mock("@codesandbox/sandpack-react", () => ({
  useSandpack: () => ({ sandpack: store }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

// Mount GET (public config probe) always resolves first; per-test POST
// responses are queued via nextPost.
let nextPost: unknown = null;
function postResponse(status: number, body: unknown) {
  nextPost = jsonResponse(status, body);
}

beforeEach(() => {
  fetchMock.mockReset();
  nextPost = null;
  fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
    if (!init?.method || init.method === "GET") {
      return Promise.resolve(
        jsonResponse(200, { enabled: true, dailyLimit: 5 }),
      );
    }
    if (!nextPost) throw new Error("POST with no queued response");
    return Promise.resolve(nextPost);
  });
});

function ask(question: string) {
  fireEvent.change(screen.getByPlaceholderText("Ask about your code..."), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

function postCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
}

describe("PromptSidebar assist", () => {
  it("loads the admin limit on mount without spending quota", async () => {
    postResponse(200, { reply: "ok", remaining: 4, limit: 5 });
    render(<PromptSidebar onClose={vi.fn()} />);
    expect(await screen.findByText("5 messages/day")).toBeTruthy();
    expect(postCalls()).toHaveLength(0);
  });

  it("posts the question with editor context and renders the reply", async () => {
    postResponse(200, { reply: "It declares a constant.", remaining: 4, limit: 5 });
    render(<PromptSidebar onClose={vi.fn()} contextLabel="Const playground" />);

    ask("What does this line do?");

    expect(await screen.findByText("It declares a constant.")).toBeTruthy();
    expect(postCalls()).toHaveLength(1);
    const [, init] = postCalls()[0];
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      message: "What does this line do?",
      fileName: "/App.js",
      contextLabel: "Const playground",
    });
    expect(body.code).toContain("const answer = 42");
    expect(screen.getByText("4 of 5 left today")).toBeTruthy();
  });

  it("locks the input when the daily quota is exhausted", async () => {
    postResponse(429, { error: "Daily limit reached.", remaining: 0, limit: 5 });
    render(<PromptSidebar onClose={vi.fn()} />);

    ask("One more?");

    expect(await screen.findByText("Daily limit reached.")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Daily limit reached — back tomorrow"),
    ).toBeDisabled();
  });

  it("shows the disabled state when the admin kill switch is off", async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse(200, { enabled: false, dailyLimit: 5 })),
    );
    render(<PromptSidebar onClose={vi.fn()} />);

    expect(await screen.findByText("Disabled")).toBeTruthy();
    expect(
      screen.getByText("AI Assist is currently disabled"),
    ).toBeTruthy();
    expect(
      screen.queryByPlaceholderText("Ask about your code..."),
    ).toBeNull();
    expect(postCalls()).toHaveLength(0);
  });

  it("asks signed-out users to sign in instead of showing the input", () => {
    render(<PromptSidebar onClose={vi.fn()} signedIn={false} />);
    expect(
      screen.getByRole("link", { name: /sign in to use ai assist/i }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.queryByPlaceholderText("Ask about your code..."),
    ).toBeNull();
    expect(postCalls()).toHaveLength(0);
  });
});
