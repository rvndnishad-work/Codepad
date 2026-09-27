import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, render } from "@testing-library/react";
import { Dialog } from "@/app/w/[slug]/(shell)/candidates/_components/ui";

function Harness() {
  const [subject, setSubject] = useState("a");
  const [body, setBody] = useState("b");
  // A new onClose on every render, like the email wording dialog passes.
  return (
    <Dialog title="Edit" onClose={() => undefined}>
      <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea aria-label="Body" value={body} onChange={(e) => setBody(e.target.value)} />
    </Dialog>
  );
}

describe("Dialog focus", () => {
  it("focuses the first field once, then leaves focus where the person is typing", () => {
    const { getByLabelText } = render(<Harness />);
    const subject = getByLabelText("Subject") as HTMLInputElement;
    const body = getByLabelText("Body") as HTMLTextAreaElement;
    expect(document.activeElement).toBe(subject);

    body.focus();
    fireEvent.change(body, { target: { value: "bc" } });
    fireEvent.change(body, { target: { value: "bcd" } });
    expect(body.value).toBe("bcd");
    expect(document.activeElement).toBe(body);
  });
});
