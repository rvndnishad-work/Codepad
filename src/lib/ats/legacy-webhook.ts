/**
 * Reads the older signed ATS webhook payloads (Greenhouse, Ashby, Lever or a
 * generic shape) into one form, and picks the job mapping they belong to.
 * Pure: no database access.
 *
 * Before the Greenhouse round trip this path made a legacy take home with no
 * Candidate and fell back to a sample challenge. Now it feeds the same import
 * as the partner API, and a payload that names no mapped job is refused
 * instead of guessing a test.
 */

export type LegacyPayload = {
  name: string;
  email: string;
  externalId: string | null;
  applicationId: string | null;
  /** A mapping id the payload names directly (partner_test_id or mapping_id). */
  mappingRef: string | null;
  jobName: string | null;
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export function parseLegacyPayload(provider: string, body: unknown): LegacyPayload | null {
  const b = obj(body);
  const p = provider.toLowerCase();
  let name = "";
  let email = "";
  let externalId: string | null = null;
  let applicationId: string | null = null;
  let jobName: string | null = null;

  if (p === "greenhouse") {
    const c = obj(b.candidate);
    name = `${str(c.first_name) ?? ""} ${str(c.last_name) ?? ""}`.trim();
    const emails = Array.isArray(c.email_addresses) ? c.email_addresses : [];
    email = str(obj(emails[0]).value) ?? str(c.email) ?? "";
    externalId = str(c.id);
    const app = obj(b.application);
    applicationId = str(app.id);
    const jobs = Array.isArray(app.jobs) ? app.jobs : [];
    jobName = str(obj(b.job).name) ?? str(obj(jobs[0]).name);
  } else if (p === "ashby") {
    const c = obj(b.candidate);
    name = str(c.name) ?? "";
    email = str(c.email) ?? str(obj(c.primaryEmailAddress).value) ?? "";
    externalId = str(c.id);
    applicationId = str(obj(b.application).id);
    jobName = str(obj(b.job).title) ?? str(obj(b.job).name);
  } else {
    name = str(b.name) ?? str(b.candidateName) ?? "";
    email = str(b.email) ?? str(b.candidateEmail) ?? "";
    externalId = str(b.candidateId);
    applicationId = str(b.applicationId) ?? str(b.opportunityId);
    jobName = str(b.jobName) ?? str(b.job) ?? str(obj(b.posting).text);
  }

  email = email.toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  if (!name) name = email.split("@")[0];
  const mappingRef = str(b.partner_test_id) ?? str(b.mapping_id) ?? str(obj(obj(b.test).custom_fields).partner_test_id);
  return { name, email, externalId, applicationId, mappingRef, jobName };
}

/** The mapping a payload belongs to: an explicit id first, then the job name. */
export function pickMapping<M extends { id: string; jobName: string }>(payload: LegacyPayload, mappings: M[]): M | null {
  if (payload.mappingRef) {
    const byId = mappings.find((m) => m.id === payload.mappingRef);
    if (byId) return byId;
  }
  if (payload.jobName) {
    const want = payload.jobName.trim().toLowerCase();
    const byName = mappings.find((m) => m.jobName.trim().toLowerCase() === want);
    if (byName) return byName;
  }
  return null;
}
