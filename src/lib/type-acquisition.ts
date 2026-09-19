/**
 * Safe wrapper around Automatic Type Acquisition (`@typescript/ata`).
 *
 * Two hazards live here, and the pre-fix code had both:
 *  1. `ata(code)` works asynchronously — a sync try/catch cannot observe its
 *     failures, so every CDN hiccup surfaced as an `unhandledRejection`
 *     (dev overlay + noise). A rejection handler is mandatory.
 *  2. ATA downloads `.d.ts` files from a CDN. Offline, the requests are
 *     doomed — skip them instead of firing failures on purpose.
 */

export type TypeAcquisitionFn = (code: string) => Promise<unknown> | void;

export function runTypeAcquisition(
  ata: TypeAcquisitionFn | null | undefined,
  code: string,
  online: boolean,
  onError: (err: unknown) => void,
): void {
  if (!ata || !code) return;
  if (!online) return;
  let result: Promise<unknown> | void;
  try {
    result = ata(code);
  } catch (err) {
    onError(err);
    return;
  }
  if (result instanceof Promise) {
    result.catch(onError);
  }
}
