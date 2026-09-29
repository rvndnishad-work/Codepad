/** "Greenhouse" for "greenhouse". Pure, with no server imports, so round summaries can use it. */
const PROVIDER_NAMES: Record<string, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

export const providerName = (p: string) => PROVIDER_NAMES[p.toLowerCase()] ?? p;
