import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

vi.mock("../copilot/actions", () => ({}));
// jsdom has no scrollIntoView.
Element.prototype.scrollIntoView = () => {};

import AssistantClient from "./AssistantClient";
import type { MessageDTO } from "@/lib/admin/assistant/conversations";

const proposalMsg: MessageDTO = {
  id: "m2",
  role: "assistant",
  content: "Northwind is past due.\nNext: Prepare an email to Dana",
  toolCalls: [
    { name: "get_workspace", args: { id: "w1" }, summary: "Looked up workspace Northwind", ok: true, href: "/admin/workspaces/w1" },
    { name: "get_credit_ledger", args: {}, summary: "Read credit ledger, 90 days", ok: true },
  ],
  proposal: {
    kind: "grant_credits",
    args: { workspaceId: "w1", amount: 20, note: "Covers the batch", emailOwner: true },
    summary: "Grant 20 AI credits to Northwind",
    facts: [{ label: "Balance after", value: "37 credits" }],
    fields: [
      { key: "amount", label: "Credits", input: "number" },
      { key: "note", label: "Ledger note", input: "textarea" },
      { key: "emailOwner", label: "Email the owner", input: "boolean" },
    ],
    approveLabel: "Approve and grant",
    status: "pending",
  },
  createdAt: new Date().toISOString(),
};

function setup() {
  return render(
    <AssistantClient
      initialConversations={[{ id: "c1", title: "Northwind credits", updatedAt: new Date().toISOString() }]}
      initialConversation="c1"
      initialMessages={[{ id: "m1", role: "user", content: "What is up with Northwind?", toolCalls: [], proposal: null, createdAt: new Date().toISOString() }, proposalMsg]}
      status={{ configured: true, paused: null, model: "GLM 5.3 Flash" }}
      alerts={[]}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssistantClient", () => {
  it("renders the rail, trace chips, card and follow-ups", () => {
    setup();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getAllByText("Northwind credits").length).toBeGreaterThan(0);
    expect(screen.getByText("Looked up workspace Northwind").closest("a")).toHaveAttribute("href", "/admin/workspaces/w1");
    expect(screen.getByText("Grant 20 AI credits to Northwind")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare an email to Dana" })).toBeInTheDocument();
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily briefing" })).toBeInTheDocument();
  });

  it("sends edited fields on approve and shows the result", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return new Response(
        JSON.stringify({ proposal: { ...proposalMsg.proposal, args: { ...proposalMsg.proposal!.args, ...body.edits }, status: "approved", result: "Granted 25 credits." } }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Credits"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve and grant" }));
    await waitFor(() => expect(screen.getByText("Granted 25 credits.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/assistant/approve", expect.anything());
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(sent).toMatchObject({ messageId: "m2", edits: { amount: 25 } });
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows a model error as an error and keeps the question", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Assistant is not configured: set GLM_API_KEY" }), { status: 503 })));
    setup();
    fireEvent.change(screen.getByLabelText("Ask the assistant"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Assistant is not configured: set GLM_API_KEY"));
    expect(screen.getByLabelText("Ask the assistant")).toHaveValue("hello");
  });
});
