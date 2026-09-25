import { describe, expect, it } from "vitest";
import { guessMapping, parseCsv, parsePastedList, rowsFromMapping } from "@/lib/crm/import";

describe("parseCsv", () => {
  it("handles quotes, embedded commas, CRLF and a BOM", () => {
    const rows = parseCsv('﻿name,email\r\n"Das, Kiran",kiran@x.io\r\n"Say ""hi""",a@b.co\r\n\r\n');
    expect(rows).toEqual([
      ["name", "email"],
      ["Das, Kiran", "kiran@x.io"],
      ['Say "hi"', "a@b.co"],
    ]);
  });
});

describe("guessMapping", () => {
  it("matches common header spellings and skips unknown columns", () => {
    expect(guessMapping(["Full name", "Email address", "Mobile", "Where from", "Skills", "Salary"])).toEqual([
      "name",
      "email",
      "phone",
      "source",
      "tags",
      "skip",
    ]);
  });
  it("uses each field once", () => {
    expect(guessMapping(["Email", "Work email"])).toEqual(["email", "skip"]);
  });
});

describe("rowsFromMapping", () => {
  it("splits tags and drops skipped columns", () => {
    expect(rowsFromMapping([["Ann", "ann@x.io", "react; node", "80k"]], ["name", "email", "tags", "skip"])).toEqual([
      { name: "Ann", email: "ann@x.io", tags: ["react", "node"] },
    ]);
  });
});

describe("parsePastedList", () => {
  it("reads the common pasted shapes", () => {
    expect(
      parsePastedList(
        [
          "Priya Raman, priya@example.com",
          "Tom Becker <tom@example.com>",
          "kiran.das@example.com",
          "Noah Brooks\tnoah@example.com\t+44 7700 900123",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      { name: "Priya Raman", email: "priya@example.com" },
      { name: "Tom Becker", email: "tom@example.com" },
      { name: "Kiran Das", email: "kiran.das@example.com" },
      { name: "Noah Brooks", email: "noah@example.com", phone: "+44 7700 900123" },
    ]);
  });
  it("keeps a line without an email so the preview can flag it", () => {
    expect(parsePastedList("Just A Name")).toEqual([{ name: "Just A Name", email: undefined }]);
  });
});
