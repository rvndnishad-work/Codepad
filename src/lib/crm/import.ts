/**
 * Client-safe helpers for the Add candidates dialog: CSV parsing, column
 * matching and the pasted-list parser. The server re-validates every row.
 */

export const IMPORT_MAX = 1000;

export type ImportField = "name" | "email" | "phone" | "source" | "tags" | "stage" | "notes" | "skip";

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  source: "Source",
  tags: "Tags",
  stage: "Stage",
  notes: "Note",
  skip: "Do not import",
};

export type ImportRow = {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  stage?: string;
  notes?: string;
};

/** RFC 4180-ish: quoted fields, embedded commas and newlines, "" escapes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_\-.]+/g, "");

const ALIASES: Record<Exclude<ImportField, "skip">, string[]> = {
  name: ["name", "fullname", "candidatename", "candidate", "firstandlastname"],
  email: ["email", "emailaddress", "mail", "workemail", "personalemail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "tel", "telephone"],
  source: ["source", "origin", "wherefrom", "channel", "referredby"],
  tags: ["tags", "tag", "skills", "labels", "keywords"],
  stage: ["stage", "pipelinestage", "status"],
  notes: ["notes", "note", "comments", "comment"],
};

/** Guess what each header means. Unknown columns are skipped; each field is used once. */
export function guessMapping(header: string[]): ImportField[] {
  const used = new Set<ImportField>();
  return header.map((h) => {
    const n = norm(h);
    for (const [field, aliases] of Object.entries(ALIASES) as [Exclude<ImportField, "skip">, string[]][]) {
      if (!used.has(field) && aliases.includes(n)) {
        used.add(field);
        return field;
      }
    }
    return "skip";
  });
}

export function splitTags(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Apply a column mapping to data rows. */
export function rowsFromMapping(data: string[][], mapping: ImportField[]): ImportRow[] {
  return data.map((cells) => {
    const r: ImportRow = {};
    mapping.forEach((field, i) => {
      const v = (cells[i] ?? "").trim();
      if (!v || field === "skip") return;
      if (field === "tags") r.tags = [...(r.tags ?? []), ...splitTags(v)];
      else r[field] = v;
    });
    return r;
  });
}

const EMAIL_IN_LINE = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/;

/**
 * Parse a pasted list. Each line is one person, in any of these shapes:
 *   Priya Raman, priya@example.com
 *   Priya Raman <priya@example.com>
 *   priya@example.com            (name taken from the address)
 *   Priya Raman	priya@example.com	+44 7700 900123   (copied from a sheet)
 */
export function parsePastedList(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(EMAIL_IN_LINE);
    const email = m?.[0];
    const rest = email ? line.replace(email, " ") : line;
    const parts = rest
      .split(/[\t,;<>]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const isPhone = (p: string) => /^\+?[\d\s().-]{7,}$/.test(p);
    const phone = parts.find(isPhone);
    let name = parts.find((p) => !isPhone(p));
    if (!name && email) {
      name = email
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    }
    rows.push({ name, email, ...(phone ? { phone } : {}) });
  }
  return rows;
}

export const CSV_TEMPLATE = "name,email,phone,source,tags,stage,notes\nPriya Raman,priya@example.com,+44 7700 900123,linkedin,react; senior,NEW,Referred by the platform team\n";
