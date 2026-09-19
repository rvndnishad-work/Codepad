/**
 * Parsing for the "package or pkg@version" dependency input.
 *
 * Pure version of the parser previously local to `useNpmSearch`.
 * `hasVersion` distinguishes "user typed an explicit version" from "we
 * defaulted to latest" — an explicitly typed version is an instruction and
 * must never be silently overridden by an autocomplete suggestion.
 */

export type ParsedDepInput = {
  name: string;
  version: string;
  hasVersion: boolean;
};

export function parseDepInput(input: string): ParsedDepInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const scoped = trimmed.startsWith("@");
  const sep = scoped ? trimmed.indexOf("@", 1) : trimmed.indexOf("@");
  if (sep === -1) {
    // "@" or "@scope/" is not a package — never install it.
    if (scoped && (trimmed === "@" || trimmed.endsWith("/"))) return null;
    return { name: trimmed, version: "latest", hasVersion: false };
  }
  const name = trimmed.slice(0, sep);
  const version = trimmed.slice(sep + 1).trim();
  if (!name) return null;
  // "axios@" is a bare name with a stray separator, not an explicit version.
  return version
    ? { name, version, hasVersion: true }
    : { name, version: "latest", hasVersion: false };
}
